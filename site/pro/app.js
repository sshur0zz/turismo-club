/* Espace équipe — démarrage, connexion, navigation (#/demandes, #/dossier/12, #/nouvelle), direct */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u, api = TC.api, root = document.getElementById('root');
  TC.state = { me: null, team: [], offers: [], requests: [], newCount: 0 };
  let channel = null, route = { name: '', params: [] };

  const parse = () => {
    const isGuide = TC.state.me && TC.state.me.role === 'guide';
    const p = (location.hash || (isGuide ? '#/jour' : '#/tableau')).replace(/^#\/?/, '').split('/');
    if (isGuide) return { name: 'vueguide', params: [['jour', 'semaine', 'dispo'].includes(p[0]) ? p[0] : 'jour'] };
    const name = ['tableau', 'demandes', 'dossier', 'nouvelle', 'motdepasse', 'bientot', 'planning', 'guides', 'emails', 'clients'].includes(p[0]) ? p[0] : 'tableau';
    return { name, params: p.slice(1) };
  };

  TC.render = keepScroll => {
    const y = scrollY, v = TC.views[route.name];
    root.innerHTML = v.html();
    v.bind && v.bind();
    if (keepScroll) scrollTo(0, y);
  };

  TC.refreshEmailCount = async () => { try { U.setEmailCount(await api.countNewEmails()); } catch { /* compteur non vital */ } };
  TC.refreshCount = async () => { try { U.setCount(await api.countNew()); } catch { /* compteur non vital */ } };
  const reloadRequests = async () => { TC.state.requests = await api.listRequests(); };

  async function go() {
    route = parse();
    document.title = 'Turismo Club — ' + t('app_title');
    document.documentElement.lang = TC.lang();
    try {
      if (route.name === 'demandes') await reloadRequests();
      if (route.name === 'tableau') await TC.views.tableau.load();
      if (route.name === 'planning') await TC.views.planning.load();
      if (route.name === 'guides') await TC.views.guides.load();
      if (route.name === 'emails') await TC.views.emails.load(route.params);
      if (route.name === 'clients') await TC.views.clients.load(route.params);
      if (route.name === 'vueguide') await TC.views.vueguide.load(route.params);
      if (route.name === 'dossier') await TC.views.dossier.load(route.params);
      if (route.name === 'bientot') await TC.views.bientot.load(route.params);
    } catch (e) {
      root.innerHTML = route.name === 'vueguide' ? `<p class="alert bad" role="alert" style="margin:24px">${U.esc(t('load_err', { msg: U.errMsg(e) }))}</p>` : U.shell(route.name, `<p class="alert bad" role="alert">${U.esc(t('load_err', { msg: U.errMsg(e) }))}</p>`);
      return;
    }
    TC.render(false);
    scrollTo(0, 0);
    const h = U.$('#main h1') || U.$('#main');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function startLive() {
    if (channel) return;
    api.onEmailsChange(async ev => {
      if (ev.eventType === 'INSERT' && ev.new) U.toast(t('em_live', { from: ev.new.from_name || ev.new.from_email }));
      TC.refreshEmailCount();
      if (route.name === 'emails' && ev.eventType === 'INSERT') await TC.views.emails.refresh();
    });
    channel = api.onRequestsChange(async ev => {
      if (ev.eventType === 'INSERT' && ev.new) U.toast(t('live_new', { name: [ev.new.first_name, ev.new.last_name].filter(Boolean).join(' ') }));
      TC.refreshCount();
      if (route.name === 'demandes') { await reloadRequests(); TC.views.demandes.refresh(); }
      else if (route.name === 'tableau') { await TC.views.tableau.load(); TC.render(true); }
      else if (route.name === 'dossier') {
        const cur = TC.views.dossier.current();
        if (cur && ev.new && ev.new.id === cur.id && !document.activeElement.closest('form')) { await TC.views.dossier.load([cur.id]); TC.render(true); }
      }
    });
  }

  async function boot() {
    const qs = new URLSearchParams(location.search);
    const linkErr = qs.get('error_description');
    root.innerHTML = `<p style="padding:24px">${t('loading')}</p>`;
    const session = await api.session(); // échange aussi le code du lien magique (?code=…) contre une session
    if (qs.has('code') || linkErr) history.replaceState(null, '', location.pathname + location.hash);
    if (!session) { root.innerHTML = TC.views.login.html(linkErr ? t('login_link_err') : ''); TC.views.login.bind(); return; }
    // Double authentification : si le compte a un code d'application, on le demande avant d'ouvrir l'espace
    try {
      const { data: aal } = await api.sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') { root.innerHTML = TC.views.mfa.html(); TC.views.mfa.bind(); return; }
    } catch { /* en cas d'erreur réseau, la suite échouera proprement */ }

    let me = null;
    try { me = await api.me(session.user.id); } catch { me = null; }
    if (!me) { root.innerHTML = TC.views.denied.html(session.user.email); return; }
    TC.state.me = me;
    if (me.role === 'guide') { window.addEventListener('hashchange', go); go(); return; }

    try {
      [TC.state.team, TC.state.offers, TC.state.newCount, TC.state.emailCount] = await Promise.all([api.team(), api.offers(), api.countNew(), api.countNewEmails()]);
    } catch (e) { root.innerHTML = `<p class="alert bad" role="alert" style="margin:24px">${U.esc(t('load_err', { msg: U.errMsg(e) }))}</p>`; return; }
    startLive();
    window.addEventListener('hashchange', go);
    go();
  }

  // Déconnexion (bouton présent sur tous les écrans)
  document.addEventListener('click', async e => {
    if (!e.target.closest('#logout')) return;
    await api.logout();
    location.replace(location.pathname);
  });
  api.sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && TC.state.me) location.replace(location.pathname); });

  boot();
})(window.TC);
