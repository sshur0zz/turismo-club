/* Espace équipe — outils communs aux écrans */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t;
  const U = TC.u = {};
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.eur = cents => new Intl.NumberFormat(TC.locale(), { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
  U.date = d => d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(TC.locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' }) : '';
  U.dateTime = d => d ? new Date(d).toLocaleString(TC.locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : '';
  U.todayRome = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  // Dates à l'heure de Rome
  U.romeDay = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(d));
  U.romeTime = d => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
  U.addDays = (day, n) => { const x = new Date(day + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  U.mondayOf = day => { const x = new Date(day + 'T12:00:00Z'); return U.addDays(day, -((x.getUTCDay() + 6) % 7)); };
  // « 2026-11-25 » + « 09:00 » à Rome → instant ISO (gère l'heure d'été)
  U.romeToIso = (day, time) => {
    const [y, m, d] = day.split('-').map(Number), [h, mi] = time.split(':').map(Number);
    const want = Date.UTC(y, m - 1, d, h, mi);
    let t = want;
    for (let k = 0; k < 2; k++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
      const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
      t += want - seen;
    }
    return new Date(t).toISOString();
  };
  U.dayLabel = day => new Date(day + 'T12:00:00Z').toLocaleDateString(TC.locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  U.guideName = g => g ? [g.first_name, g.last_name].filter(Boolean).join(' ') : '';
  U.hoursSince = d => (Date.now() - new Date(d).getTime()) / 36e5;
  U.ago = d => {
    const h = U.hoursSince(d);
    if (h < 1) return t('ago_min', { n: Math.max(1, Math.round(h * 60)) });
    if (h < 48) return t('ago_h', { n: Math.floor(h) });
    return t('ago_d', { n: Math.floor(h / 24) });
  };
  U.name = r => [r.first_name, r.last_name].filter(Boolean).join(' ');
  U.typeOf = r => r.activity ? r.activity.type : (r.offer_slug === 'sur-mesure' ? 'custom' : 'custom');
  U.offerLabel = r => r.activity ? r.activity.title : t('custom_trip');
  U.badge = s => `<span class="badge st-${s}">${t('st1_' + s)}</span>`;
  U.src = s => `<span class="badge src">${U.esc(t('src_' + s))}</span>`;
  U.langName = l => TC.LANGS[l] || (l || '').toUpperCase();
  U.STATUSES = ['new', 'in_progress', 'sent', 'won', 'done', 'lost'];
  U.toast = msg => { const el = U.$('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(U.toast.tm); U.toast.tm = setTimeout(() => (el.hidden = true), 3000); };
  U.errMsg = e => (e && (e.message || e.error_description)) || String(e);
  // Équivalent de patchOf : on n'envoie à la base que les champs réellement modifiés (jamais de valeur par défaut réinjectée)
  U.patchOf = (before, after) => Object.fromEntries(Object.entries(after).filter(([k, v]) => {
    const a = before[k] == null ? null : before[k], b = v === '' ? null : v;
    return JSON.stringify(a) !== JSON.stringify(b);
  }).map(([k, v]) => [k, v === '' ? null : v]));
  // Motif obligatoire avant de passer une demande en « Annulée » ; renvoie le texte, ou null si l'utilisateur renonce
  U.askLostReason = () => new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'dlg'; d.setAttribute('aria-labelledby', 'lr-h');
    d.innerHTML = `<form method="dialog" class="dlgform"><h2 id="lr-h">${t('lost_t')}</h2><p class="sub" style="margin:0">${t('lost_d')}</p>
      <div class="field"><label for="lr-txt">${t('lost_l')}</label><textarea id="lr-txt" maxlength="500" required aria-describedby="lr-err"></textarea><span class="err" id="lr-err" role="alert"></span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" value="ok">${t('lost_ok')}</button><button class="btn quiet" value="cancel" formnovalidate>${t('cl_cancel')}</button></div></form>`;
    document.body.appendChild(d);
    const done = v => { d.close(); d.remove(); resolve(v); };
    d.querySelector('form').addEventListener('submit', e => {
      if (e.submitter && e.submitter.value === 'cancel') { e.preventDefault(); done(null); return; }
      const v = d.querySelector('#lr-txt').value.trim();
      if (!v) { e.preventDefault(); d.querySelector('#lr-err').textContent = t('lost_need'); d.querySelector('#lr-txt').focus(); return; }
      e.preventDefault(); done(v);
    });
    d.addEventListener('cancel', e => { e.preventDefault(); done(null); });
    d.showModal(); d.querySelector('#lr-txt').focus();
  });
  // Passage d'étape commun (colonnes, fiche) : demande le motif si « Annulée »
  U.statusPatch = async status => {
    if (status !== 'lost') return { status };
    const reason = await U.askLostReason();
    return reason ? { status, lost_reason: reason } : null;
  };
  // Pourcentage saisi (« 10 » ou « 10,5 ») → points de base entiers (1 000 = 10 %) ; affichage inverse
  U.bp = v => { const s = String(v == null ? '' : v).trim().replace(',', '.'); if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN; const [i, d = ''] = s.split('.'); return Number(i) * 100 + Number((d + '00').slice(0, 2)); };
  U.pct = bp => bp == null ? '' : (bp / 100).toLocaleString(TC.locale(), { maximumFractionDigits: 2 }) + ' %';
  U.euroIn = cents => cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',');   // valeur d'un champ de saisie en euros
  U.cents = v => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };

  // Logo « L'Arche » (même dessin que le site public)
  U.logo = () => `<svg viewBox="0 0 230 50" role="img" aria-label="Turismo Club" xmlns="http://www.w3.org/2000/svg"><path d="M4 48V22a20 20 0 0 1 40 0v26z" style="fill:var(--accent)"/><path d="M14 48V24a10 10 0 0 1 20 0v24z" style="fill:#FFFFFF"/><path d="M17 48a7 7 0 0 1 14 0z" style="fill:var(--accent)"/><text x="58" y="27" style="font:800 23px 'Plus Jakarta Sans',sans-serif;fill:var(--ink)">Turismo Club</text><text x="59" y="43" style="font:600 9.5px 'Plus Jakarta Sans',sans-serif;letter-spacing:3.2px;fill:#6B7280">ROMA · ITALIA</text></svg>`;

  // Cadre : menu latéral + contenu
  U.shell = (active, content) => {
    const me = TC.state.me;
    const soon = `<span class="badge src" style="font-size:11px">${t('soon')}</span>`;
    const links = [['tableau', t('nav_dash')], ['demandes', t('nav_requests'), `<span class="count" id="newCount" aria-label="${TC.state.newCount}">${TC.state.newCount}</span>`],
      ['emails', t('nav_emails'), `<span class="count" id="emailCount" aria-label="${TC.state.emailCount || 0}">${TC.state.emailCount || 0}</span>`],
      ['taches', t('nav_tasks'), `<span class="count" id="taskCount">${TC.state.taskCount || 0}</span>`], ['clients', t('nav_clients')], ['fournisseurs', t('nav_suppliers')], ['hotels', t('nav_hotels')], ['planning', t('nav_plan')], ['guides', t('nav_guides')], ['bientot/paiement', t('nav_pay'), soon], ['motdepasse', t('nav_password')]];
    return `<div class="shell">
      <aside class="side" aria-label="Menu">
        <a class="brand" href="#/tableau">${U.logo()}<span class="tag">${t('tag')}</span></a>
        <nav class="nav">${links.map(([k, l, extra]) => `<a href="#/${k}" ${active === k ? 'aria-current="page"' : ''}><span>${l}</span>${extra || ''}</a>`).join('')}
          <a href="https://mail.google.com/" target="_blank" rel="noopener"><span>${t('nav_gmail')}</span><span class="sub" style="font-size:12px">Gmail ↗<span class="sr"> (${t('new_tab')})</span></span></a></nav>
        <div class="who"><div class="info"><strong>${U.esc(me.full_name)}</strong><span>${t('role_' + me.role)}</span></div>
          ${U.langSwitch()}
          <button type="button" class="btn quiet small" id="logout">${t('logout')}</button></div>
      </aside>
      <main id="main" tabindex="-1">${content}</main></div>`;
  };
  U.langSwitch = () => `<label class="sr" for="uiLang">${t('ui_lang')}</label><select id="uiLang" class="langsw" aria-label="${t('ui_lang')}">${Object.entries(TC.UI_LANGS).map(([k, v]) => `<option value="${k}" ${k === TC.lang() ? 'selected' : ''} lang="${k}">${v}</option>`).join('')}</select>`;
  document.addEventListener('change', e => { if (e.target.id === 'uiLang') { TC.setLang(e.target.value); location.reload(); } });
  U.setEmailCount = n => { TC.state.emailCount = n; const c = U.$('#emailCount'); if (c) { c.textContent = n; c.setAttribute('aria-label', String(n)); } };
  U.setCount = n => { TC.state.newCount = n; const c = U.$('#newCount'); if (c) { c.textContent = n; c.setAttribute('aria-label', String(n)); } };
})(window.TC);
