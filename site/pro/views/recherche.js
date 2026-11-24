/* Recherche globale (Ctrl+K ou ⌘K, ou bouton du menu) : demandes, clients, hôtels, fournisseurs, véhicules, contrats.
   Les requêtes passent par la base avec les droits de la personne connectée (RLS) : on ne trouve que ce qu'on a le droit de voir.
   Navigation au clavier : flèches haut/bas, Entrée, Échap. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  let dlg = null, seq = 0, items = [], cur = -1;
  const like = q => `%${q.replace(/[%_,()]/g, ' ').trim()}%`;
  const SOURCES = [
    ['req', q => TC.api.sel('quote_requests', 'id,reference,first_name,last_name,email', b => b.or(`reference.ilike.${like(q)},first_name.ilike.${like(q)},last_name.ilike.${like(q)},email.ilike.${like(q)}`).order('created_at', { ascending: false }).limit(6)),
      r => [`${r.reference} · ${U.name(r)}`, '#/dossier/' + r.id]],
    ['cli', q => TC.api.sel('customers', 'id,first_name,last_name,email,phone_e164', b => b.is('merged_into_id', null).or(`first_name.ilike.${like(q)},last_name.ilike.${like(q)},email.ilike.${like(q)},phone_e164.ilike.${like(q)}`).limit(6)),
      r => [`${U.name(r)}${r.email ? ' · ' + r.email : ''}`, '#/clients/' + r.id]],
    ['hot', q => TC.api.sel('hotels', 'id,name', b => b.ilike('name', like(q)).limit(5)), r => [r.name, '#/hotels/' + r.id]],
    ['sup', q => TC.api.sel('suppliers', 'id,name,kind', b => b.ilike('name', like(q)).limit(5)), r => [r.name, '#/fournisseurs']],
    ['veh', q => TC.api.sel('vehicles', 'id,plate,make,model', b => b.or(`plate.ilike.${like(q)},model.ilike.${like(q)},make.ilike.${like(q)}`).limit(5)), r => [`${r.plate} · ${r.make} ${r.model}`, '#/flotte/' + r.id]],
    ['ren', q => TC.api.sel('rental_contracts', 'id,reference,driver_name', b => b.or(`reference.ilike.${like(q)},driver_name.ilike.${like(q)}`).limit(5)), r => [`${r.reference} · ${r.driver_name}`, '#/locations/' + r.id]]
  ];
  const QUICK = () => [[t('nav_new'), '#/nouvelle'], [t('rl_new'), '#/locations/nouveau'], [t('fl_new'), '#/flotte'], [t('ho_new_t'), '#/hotels'], [t('tk_add'), '#/taches']];

  function render(groups) {
    items = []; const out = U.$('#gsList');
    out.innerHTML = groups.map(([g, rows]) => rows.length ? `<li role="presentation"><p class="gsgrp">${t('gs_' + g)}</p></li>` + rows.map(([label, href]) => { items.push(href);
      return `<li role="option" id="gs-${items.length - 1}" aria-selected="false" data-href="${U.esc(href)}" tabindex="-1">${U.esc(label)}</li>`; }).join('') : '').join('') || `<li role="presentation" class="sub">${t('gs_none')}</li>`;
    cur = items.length ? 0 : -1; mark();
  }
  function mark() { U.$$('#gsList [role=option]').forEach((li, i) => li.setAttribute('aria-selected', String(i === cur))); const inp = U.$('#gsInput'); inp.setAttribute('aria-activedescendant', cur >= 0 ? 'gs-' + cur : ''); const el = U.$('#gs-' + cur); if (el) el.scrollIntoView({ block: 'nearest' }); }
  function go(href) { close(); location.hash = href; }
  function close() { if (dlg) { dlg.close(); dlg.remove(); dlg = null; } }
  async function search(q) {
    const my = ++seq;
    if (q.trim().length < 2) { render([['quick', QUICK()]]); return; }
    const res = await Promise.all(SOURCES.map(([g, fn, fmt]) => fn(q).then(rows => [g, rows.map(fmt)]).catch(() => [g, []])));
    if (my === seq && dlg) render(res);
  }
  TC.openSearch = () => {
    if (dlg || !TC.state.me || TC.state.me.role === 'guide') return;
    dlg = document.createElement('dialog'); dlg.className = 'dlg gs'; dlg.setAttribute('aria-labelledby', 'gs-h');
    dlg.innerHTML = `<div class="dlgform"><h2 id="gs-h">${t('gs_t')}</h2>
      <input id="gsInput" type="search" role="combobox" aria-expanded="true" aria-controls="gsList" aria-autocomplete="list" placeholder="${t('gs_ph')}" autocomplete="off">
      <ul id="gsList" role="listbox" aria-label="${t('gs_results')}" class="gslist"></ul><p class="sub" style="margin:0;font-size:12.5px">${t('gs_help')}</p></div>`;
    document.body.appendChild(dlg); dlg.showModal();
    const inp = U.$('#gsInput'); inp.focus(); let tm;
    inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => search(inp.value), 200); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); cur = (cur + 1) % items.length; mark(); }
      if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); cur = (cur - 1 + items.length) % items.length; mark(); }
      if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); go(items[cur]); }
    });
    dlg.addEventListener('click', e => { const li = e.target.closest('[data-href]'); if (li) go(li.dataset.href); else if (e.target === dlg) close(); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
    search('');
  };
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); TC.openSearch(); } });
  document.addEventListener('click', e => { if (e.target.closest('#gsBtn')) TC.openSearch(); });
})(window.TC);
