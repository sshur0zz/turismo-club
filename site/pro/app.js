/* Espace équipe — démarrage, connexion, navigation (#/demandes, #/dossier/12, #/nouvelle), direct */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u, api = TC.api, root = document.getElementById('root');
  TC.state = { me: null, team: [], offers: [], requests: [], newCount: 0 };
  let channel = null, route = { name: '', params: [] };

  const parse = () => {
    const p = (location.hash || '#/tableau').replace(/^#\/?/, '').split('/');
    const name = ['tableau', 'demandes', 'dossier', 'nouvelle', 'motdepasse', 'bientot'].includes(p[0]) ? p[0] : 'tableau';
    return { name, params: p.slice(1) };
  };

  TC.render = keepScroll => {
    const y = scrollY, v = TC.views[route.name];
    root.innerHTML = v.html();
    v.bind && v.bind();
    if (keepScroll) scrollTo(0, y);
  };

  TC.refreshCount = async () => { try { U.setCount(await api.countNew()); } catch { /* compteur non vital */ } };
  const reloadRequests = async () => { TC.state.requests = await api.listRequests(); };

  async function go() {
    route = parse();
    document.title = 'Turismo Club — ' + t('app_title');
    document.documentElement.lang = TC.lang();
    try {
      if (route.name === 'demandes') await reloadRequests();
      if (route.name === 'tableau') await TC.views.tableau.load();
      if (route.name === 'dossier') await TC.views.dossier.load(route.params);
      if (route.name === 'bientot') await TC.views.bientot.load(route.params);
    } catch (e) {
      root.innerHTML = U.shell(route.name, `<p class="alert bad" role="alert">${U.esc(t('load_err', { msg: U.errMsg(e) }))}</p>`);
      return;
    }
    TC.render(false);
    scrollTo(0, 0);
    const h = U.$('#main h1') || U.$('#main');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function startLive() {
    if (channel) return;
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

    let me = null;
    try { me = await api.me(session.user.id); } catch { me = null; }
    if (!me) { root.innerHTML = TC.views.denied.html(session.user.email); return; }
    TC.state.me = me;
    if (me.role === 'guide') { root.innerHTML = TC.views.denied.html(me.email, t('guide_soon_t'), t('guide_soon_d')); return; }

    try {
      [TC.state.team, TC.state.offers, TC.state.newCount] = await Promise.all([api.team(), api.offers(), api.countNew()]);
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
