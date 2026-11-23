/* Espace équipe — accès à la base Supabase.
   Clé PUBLIQUE uniquement : les droits réels sont appliqués par la base (RLS) selon le rôle du compte connecté. */
window.TC = window.TC || {};
(function (TC) {
  const URL = 'https://dkocjkpcfneyevxexrsr.supabase.co';
  const KEY = 'sb_publishable_LduCL-R41JyZCNodRv4S_A_WCHCdKCX';
  // Le jeton de session (connexion) est le seul élément gardé par le navigateur.
  const sb = window.supabase.createClient(URL, KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tc-pro-auth' }
  });

  const must = ({ data, error }) => { if (error) throw error; return data; };

  const REQ_LIST = 'id,reference,status,source,created_at,updated_at,first_name,last_name,travelers,date_from,language,preferred_language,offer_slug,assigned_staff_id,confirmed_at,activity:activities(id,type,title)';

  TC.api = {
    sb,
    // ---- Connexion ----
    sendMagicLink: email => sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.origin + '/pro/', shouldCreateUser: false }
    }),
    signInPassword: (email, password) => sb.auth.signInWithPassword({ email, password }),
    session: async () => (await sb.auth.getSession()).data.session,
    logout: () => sb.auth.signOut(),
    me: async uid => must(await sb.from('staff').select('id,email,full_name,role,guide_id,is_active').eq('id', uid).eq('is_active', true).maybeSingle()),

    // ---- Référentiels ----
    team: async () => must(await sb.from('staff').select('id,full_name,role').eq('is_active', true).order('full_name')),
    offers: async () => must(await sb.from('activities').select('id,slug,type,title,price_adult_cents,is_published,max_group_size,duration_minutes,min_participants').order('type').order('title')),

    // ---- Demandes ----
    listRequests: async () => must(await sb.from('quote_requests').select(REQ_LIST).order('created_at', { ascending: false }).limit(500)),
    countNew: async () => {
      const { count, error } = await sb.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new');
      if (error) throw error; return count || 0;
    },
    getRequest: async id => must(await sb.from('quote_requests').select(
      '*, activity:activities(id,type,title,slug), customer:customers(id,first_name,last_name,email,phone,locale), ' +
      'items:request_items(*), payments(id,amount_cents,method,paid_on,provider,note,created_at), ' +
      'events:booking_events(id,kind,message,created_at,author:staff(full_name))'
    ).eq('id', id).maybeSingle()),
    pastBookings: async (customerId, excludeId) => {
      if (!customerId) return 0;
      const { count, error } = await sb.from('quote_requests').select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId).in('status', ['won', 'done']).neq('id', excludeId);
      if (error) throw error; return count || 0;
    },
    updateRequest: async (id, patch) => must(await sb.from('quote_requests').update(patch).eq('id', id).select('id').single()),
    createRequest: async row => must(await sb.from('quote_requests').insert(row).select('id').single()),

    allItems: async () => must(await sb.from('request_items').select('request_id,amount_cents').limit(10000)),
    allPayments: async () => must(await sb.from('payments').select('request_id,amount_cents,paid_on').not('request_id', 'is', null).limit(10000)),

    // ---- Prestations ----
    addItem: async row => must(await sb.from('request_items').insert(row).select('id').single()),
    updateItem: async (id, patch) => must(await sb.from('request_items').update(patch).eq('id', id).select('id').single()),
    deleteItem: async id => must(await sb.from('request_items').delete().eq('id', id)),

    // ---- Paiements ----
    addPayment: async row => must(await sb.from('payments').insert(row).select('id').single()),
    deletePayment: async id => must(await sb.from('payments').delete().eq('id', id)),

    // ---- Planning ----
    departures: async (fromIso, toIso) => must(await sb.from('departures')
      .select('id,starts_at,language,capacity,status,tickets_status,note,guide_id,activity:activities(id,title,type,duration_minutes,min_participants,max_group_size,meeting_point)')
      .gte('starts_at', fromIso).lt('starts_at', toIso).order('starts_at').limit(2000)),
    departureFill: async ids => {
      if (!ids.length) return { bookings: [], items: [] };
      const [b, i] = await Promise.all([
        sb.from('bookings').select('id,departure_id,adults,children,status').in('departure_id', ids).in('status', ['pending', 'confirmed']),
        sb.from('request_items').select('id,departure_id,people,request:quote_requests(id,reference,first_name,last_name,status,preferred_language,language,internal_note)').in('departure_id', ids)
      ]);
      return { bookings: must(b), items: must(i) };
    },
    saveDeparture: async (id, row) => id
      ? must(await sb.from('departures').update(row).eq('id', id).select('id').single())
      : must(await sb.from('departures').insert(row).select('id').single()),
    guides: async () => must(await sb.from('guides').select('id,first_name,last_name,languages,is_active').order('first_name')),
    saveGuide: async (id, row) => id
      ? must(await sb.from('guides').update(row).eq('id', id).select('id').single())
      : must(await sb.from('guides').insert(row).select('id').single()),
    availability: async (fromDay, toDay) => must(await sb.from('guide_availability').select('guide_id,day,available').gte('day', fromDay).lte('day', toDay)),
    guideDeparturesForGuides: async (fromIso, toIso) => must(await sb.from('departures').select('id,starts_at,guide_id,status,activity:activities(title,duration_minutes)')
      .gte('starts_at', fromIso).lt('starts_at', toIso).not('guide_id', 'is', null).neq('status', 'cancelled')),

    // ---- Vue guide ----
    myDepartures: async (fromDay, toDay) => must(await sb.rpc('guide_departures', { p_from: fromDay, p_to: toDay })),
    checkin: async (kind, id, checked) => must(await sb.rpc('guide_checkin', { p_kind: kind, p_id: id, p_checked: checked })),
    setAvailability: async (guideId, day, available) => available === null
      ? must(await sb.from('guide_availability').delete().eq('guide_id', guideId).eq('day', day))
      : must(await sb.from('guide_availability').upsert({ guide_id: guideId, day, available, updated_at: new Date().toISOString() })),

    // ---- Direct ----
    onRequestsChange: cb => sb.channel('pro-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, cb)
      .subscribe()
  };
})(window.TC);
