/* Planning de la semaine : départs, remplissage, guide, alertes ; fiche d'un départ ; création d'un départ */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const P = { week: null, type: 'all', onlyFilled: false, deps: [], fill: {}, guides: [], avail: [], open: null, creating: false };
  const typeClass = ty => (ty === 'activity' ? 't-activity' : ty === 'circuit' ? 't-circuit' : 't-other');
  const minutes = d => Math.min(Math.max(d.activity.duration_minutes || 120, 30), 720);
  const LANG_KEYS = ['en', 'it', 'fr', 'es', 'de', 'pt', 'nl', 'zh', 'ja', 'ko'];

  // Remplissage : réservations (en attente + confirmées) et prestations des dossiers confirmés ; « en option » = dossiers pas encore confirmés
  function computeFill(bookings, items) {
    const f = {};
    const get = id => (f[id] = f[id] || { confirmed: 0, pending: 0, list: [] });
    bookings.forEach(b => { const x = get(b.departure_id); x.confirmed += b.adults + b.children; x.list.push({ kind: 'b', name: '#' + b.id, people: b.adults + b.children, ok: true }); });
    items.forEach(i => {
      const r = i.request; if (!r || r.status === 'lost') return;
      const x = get(i.departure_id), ok = r.status === 'won' || r.status === 'done';
      if (ok) x.confirmed += i.people; else x.pending += i.people;
      x.list.push({ kind: 'i', id: r.id, ref: r.reference, name: U.name(r), people: i.people, ok, lang: r.preferred_language || r.language, note: r.internal_note });
    });
    return f;
  }

  const guideById = id => P.guides.find(g => g.id === id);
  function warnings(depId, guideId, day, start, dur, cap, filled) {
    const w = [];
    const g = guideById(guideId);
    if (g) {
      const s = new Date(start).getTime(), e = s + dur * 60000;
      const clash = P.deps.find(o => o.id !== depId && o.guide_id === guideId && o.status !== 'cancelled' &&
        new Date(o.starts_at).getTime() < e && new Date(o.starts_at).getTime() + minutes(o) * 60000 > s);
      if (clash) w.push(t('dp_overlap', { name: U.esc(U.guideName(g)), when: U.romeTime(clash.starts_at) + ' · ' + U.esc(clash.activity.title) }));
      if (P.avail.some(a => a.guide_id === guideId && a.day === day && a.available === false)) w.push(t('dp_unavail', { name: U.esc(U.guideName(g)) }));
    }
    if (cap && filled > cap) w.push(t('dp_over', { n: filled, cap }));
    return w;
  }

  function depButton(d) {
    const f = P.fill[d.id] || { confirmed: 0, pending: 0 };
    const full = f.confirmed >= d.capacity, g = guideById(d.guide_id);
    const min = d.activity.min_participants, closed = d.status === 'cancelled';
    const alerts = [];
    if (!closed && !d.guide_id && d.activity.type !== 'bus') alerts.push(t('pl_no_guide'));
    if (!closed && min && f.confirmed < min) alerts.push(t('pl_min', { n: min }));
    return `<button type="button" class="dep ${typeClass(d.activity.type)}${closed ? ' closed' : ''}" data-dep="${d.id}">
      <span class="dt"><strong>${U.romeTime(d.starts_at)}</strong> ${U.esc(d.activity.title)}</span>
      <span class="df">${closed ? t('pl_closed') : full ? `<span class="okc">${t('pl_full')}</span>` : `${f.confirmed}/${d.capacity}`}${f.pending ? ` · +${f.pending}` : ''} · ${g ? U.esc(U.guideName(g)) : '—'}</span>
      ${alerts.map(a => `<span class="alert-mini">${a}</span>`).join('')}
    </button>`;
  }

  function grid() {
    const days = [...Array(7)].map((_, i) => U.addDays(P.week, i));
    const today = U.todayRome();
    const shown = P.deps.filter(d => (P.type === 'all' || typeClass(d.activity.type) === 't-' + P.type) &&
      (!P.onlyFilled || ((P.fill[d.id] || {}).confirmed || 0) + ((P.fill[d.id] || {}).pending || 0) > 0));
    return `<div class="week">${days.map(day => {
      const list = shown.filter(d => U.romeDay(d.starts_at) === day);
      return `<section class="day${day === today ? ' is-today' : ''}" aria-labelledby="day-${day}"><h2 id="day-${day}">${U.esc(U.dayLabel(day))}</h2>
        ${list.length ? list.map(depButton).join('') : `<p class="sub" style="font-size:13px;margin:4px">${t('pl_none_day')}</p>`}</section>`;
    }).join('')}</div>`;
  }

  function dialog() {
    const d = P.open, creating = P.creating;
    const f = d ? (P.fill[d.id] || { confirmed: 0, pending: 0, list: [] }) : { confirmed: 0, pending: 0, list: [] };
    const day = d ? U.romeDay(d.starts_at) : (P.week > U.todayRome() ? P.week : U.todayRome());
    const time = d ? U.romeTime(d.starts_at) : '09:00';
    const offers = TC.state.offers.filter(o => ['activity', 'bus', 'circuit'].includes(o.type));
    const w = d ? warnings(d.id, d.guide_id, day, d.starts_at, minutes(d), d.capacity, f.confirmed) : [];
    return `<dialog id="depDlg" aria-labelledby="dep-h" class="dlg">
      <form id="depForm" novalidate method="dialog">
        <h2 id="dep-h" style="font-size:18px;margin-bottom:4px">${creating ? t('pl_new').replace('+ ', '') : U.esc(d.activity.title)}</h2>
        ${d ? `<p class="sub" style="margin:0 0 12px">${U.esc(U.dayLabel(day))} · ${time} · ${t('dp_filled', { n: f.confirmed, cap: d.capacity })}${f.pending ? ` (+${f.pending} ${t('dp_pending')})` : ''}</p>` : ''}
        <div id="depWarn">${w.map(x => `<p class="alert bad" style="margin:0 0 8px">${x}</p>`).join('')}</div>
        ${creating ? `<div class="field"><label for="dp-offer">${t('dp_offer')}</label><select id="dp-offer" required aria-describedby="e-dp-offer"><option value="">${t('choose')}</option>${offers.map(o => `<option value="${o.id}">${U.esc(o.title)}</option>`).join('')}</select><span class="err" id="e-dp-offer"></span></div>` : ''}
        <div class="row" style="margin-top:10px">
          <div class="field"><label for="dp-date">${t('dp_date')}</label><input id="dp-date" type="date" value="${day}" required aria-describedby="e-dp-date"></div>
          <div class="field"><label for="dp-time">${t('dp_time')}</label><input id="dp-time" type="time" value="${time}" required aria-describedby="e-dp-date"></div>
          <div class="field"><label for="dp-cap">${t('dp_cap')}</label><input id="dp-cap" type="number" min="1" max="999" inputmode="numeric" value="${d ? d.capacity : ''}" aria-describedby="e-dp-cap"><span class="err" id="e-dp-cap"></span></div>
        </div>
        <span class="err" id="e-dp-date"></span>
        <div class="row" style="margin-top:10px">
          <div class="field"><label for="dp-guide">${t('dp_guide')}</label><select id="dp-guide"><option value="">${t('no_guide')}</option>${P.guides.filter(g => g.is_active || (d && g.id === d.guide_id)).map(g => `<option value="${g.id}" ${d && d.guide_id === g.id ? 'selected' : ''}>${U.esc(U.guideName(g))} (${g.languages.map(l => l.toUpperCase()).join(', ')})</option>`).join('')}</select></div>
          <div class="field"><label for="dp-lang">${t('dp_lang')}</label><select id="dp-lang">${LANG_KEYS.map(l => `<option value="${l}" ${(d ? d.language : 'en') === l ? 'selected' : ''}>${U.esc(U.langName(l))}</option>`).join('')}</select></div>
        </div>
        <div class="row" style="margin-top:10px">
          <div class="field"><label for="dp-tickets">${t('dp_tickets')}</label><select id="dp-tickets">${['na', 'a_acheter', 'achetes'].map(k => `<option value="${k}" ${(d ? d.tickets_status : 'na') === k ? 'selected' : ''}>${t('tk_' + k)}</option>`).join('')}</select></div>
          <div class="field"><label for="dp-status">${t('dp_status')}</label><select id="dp-status">${['open', 'full', 'cancelled'].map(k => `<option value="${k}" ${(d ? d.status : 'open') === k ? 'selected' : ''}>${t('ds_' + k)}</option>`).join('')}</select></div>
        </div>
        <div class="field" style="margin-top:10px"><label for="dp-note">${t('dp_note')}</label><textarea id="dp-note" maxlength="1000" style="min-height:64px">${U.esc(d && d.note ? d.note : '')}</textarea></div>
        ${d ? `<h3 style="font-size:14px;margin:16px 0 8px">${t('dp_participants')}</h3>
          ${f.list.length ? `<ul class="plist">${f.list.map(p => `<li>${p.kind === 'i' ? `<a href="#/dossier/${p.id}">${U.esc(p.name)}</a> <span class="sub">${U.esc(p.ref || '')}</span>` : U.esc(p.name)} · ${t('vg_people', { n: p.people })}${p.lang ? ' · ' + U.esc(U.langName(p.lang)) : ''}${p.ok ? '' : ` · <em>${t('dp_pending')}</em>`}${p.note ? `<br><span class="sub">${U.esc(p.note)}</span>` : ''}</li>`).join('')}</ul>` : `<p class="sub">${t('dp_none')}</p>`}` : ''}
        <span class="err" id="e-dp-form" role="alert"></span>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
          <button type="submit" class="btn" value="save">${creating ? t('dp_create') : t('dp_save')}</button>
          <button type="button" class="btn quiet" id="depClose">${t('close')}</button></div>
      </form></dialog>`;
  }

  async function load() {
    const from = U.romeToIso(P.week, '00:00'), to = U.romeToIso(U.addDays(P.week, 7), '00:00');
    const [deps, guides, avail] = await Promise.all([TC.api.departures(from, to), TC.api.guides(), TC.api.availability(P.week, U.addDays(P.week, 6))]);
    const fill = await TC.api.departureFill(deps.map(d => d.id));
    Object.assign(P, { deps, guides, avail, fill: computeFill(fill.bookings, fill.items) });
  }

  function openDialog() {
    const host = U.$('#dlgHost'); host.innerHTML = dialog();
    const dlg = U.$('#depDlg'); dlg.showModal();
    const refreshWarn = () => {
      const d = P.open, gid = Number(U.$('#dp-guide').value) || null, day = U.$('#dp-date').value, time = U.$('#dp-time').value;
      if (!day || !time) return;
      const act = d ? d.activity : TC.state.offers.find(o => String(o.id) === (U.$('#dp-offer') || {}).value);
      const dur = d ? minutes(d) : Math.min(Math.max((act && act.duration_minutes) || 120, 30), 720);
      const f = d ? (P.fill[d.id] || { confirmed: 0 }) : { confirmed: 0 };
      U.$('#depWarn').innerHTML = warnings(d ? d.id : null, gid, day, U.romeToIso(day, time), dur, Number(U.$('#dp-cap').value) || 0, f.confirmed).map(x => `<p class="alert bad" style="margin:0 0 8px">${x}</p>`).join('');
    };
    ['#dp-guide', '#dp-date', '#dp-time', '#dp-cap'].forEach(s => U.$(s).addEventListener('change', refreshWarn));
    const offerSel = U.$('#dp-offer');
    if (offerSel) offerSel.addEventListener('change', () => { const o = TC.state.offers.find(x => String(x.id) === offerSel.value); if (o && !U.$('#dp-cap').value) U.$('#dp-cap').value = o.max_group_size || ''; refreshWarn(); });
    U.$('#depClose').addEventListener('click', () => { dlg.close(); });
    dlg.addEventListener('close', () => { P.open = null; P.creating = false; host.innerHTML = ''; });
    U.$('#depForm').addEventListener('submit', async e => {
      e.preventDefault();
      const day = U.$('#dp-date').value, time = U.$('#dp-time').value, cap = Math.round(Number(U.$('#dp-cap').value));
      const errs = { 'e-dp-date': day && time ? '' : t('e_dp_date'), 'e-dp-cap': cap >= 1 && cap <= 999 ? '' : t('e_dp_cap') };
      if (P.creating) errs['e-dp-offer'] = offerSel.value ? '' : t('e_dp_offer');
      let bad = false; for (const [k, m] of Object.entries(errs)) { U.$('#' + k).textContent = m; if (m) bad = true; }
      if (bad) return;
      const row = { starts_at: U.romeToIso(day, time), capacity: cap, guide_id: Number(U.$('#dp-guide').value) || null, language: U.$('#dp-lang').value,
        tickets_status: U.$('#dp-tickets').value, status: U.$('#dp-status').value, note: U.$('#dp-note').value.trim() || null };
      if (P.creating) row.activity_id = Number(offerSel.value);
      try {
        await TC.api.saveDeparture(P.creating ? null : P.open.id, row);
        dlg.close(); U.toast(t('saved'));
        await load(); TC.render(true);
      } catch (err) { U.$('#e-dp-form').textContent = t('save_err', { msg: U.errMsg(err) }); }
    });
  }

  TC.views.planning = {
    load: async () => { if (!P.week) P.week = U.mondayOf(U.todayRome()); await load(); },
    html: () => U.shell('planning', `
      <div class="page-head"><div><h1>${t('pl_t')}</h1><p class="sub">${t('pl_week', { from: U.dayLabel(P.week), to: U.dayLabel(U.addDays(P.week, 6)) })}</p></div>
        <button type="button" class="btn" id="newDep">${t('pl_new')}</button></div>
      <div class="toolbar">
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button type="button" class="btn quiet small" id="wkPrev">${t('pl_prev')}</button>
          <button type="button" class="btn quiet small" id="wkToday">${t('pl_today')}</button>
          <button type="button" class="btn quiet small" id="wkNext">${t('pl_next')}</button></div>
        <div role="group" aria-label="${t('filter_type')}" class="chips">${[['all', t('ty_all')], ['activity', t('lg_activity')], ['circuit', t('lg_circuit')], ['other', t('lg_other')]].map(([k, l]) => `<button type="button" class="chip" data-ptype="${k}" aria-pressed="${P.type === k}">${l}</button>`).join('')}</div>
        <label style="display:flex;align-items:center;gap:8px;min-height:44px;font-weight:600"><input type="checkbox" id="onlyFilled" ${P.onlyFilled ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('pl_only_full')}</label>
      </div>
      <p class="legend" aria-label="${t('legend')}"><span class="sw t-activity"></span>${t('lg_activity')} <span class="sw t-circuit"></span>${t('lg_circuit')} <span class="sw t-other"></span>${t('lg_other')} <span class="alert-mini">${t('pl_no_guide')}</span></p>
      <div id="weekGrid">${grid()}</div><div id="dlgHost"></div>`),
    bind: () => {
      const main = U.$('#main');
      const move = async n => { P.week = n === 0 ? U.mondayOf(U.todayRome()) : U.addDays(P.week, n); await load(); TC.render(false); };
      U.$('#wkPrev').addEventListener('click', () => move(-7));
      U.$('#wkNext').addEventListener('click', () => move(7));
      U.$('#wkToday').addEventListener('click', () => move(0));
      U.$('#onlyFilled').addEventListener('change', e => { P.onlyFilled = e.target.checked; U.$('#weekGrid').innerHTML = grid(); });
      U.$('#newDep').addEventListener('click', () => { P.open = null; P.creating = true; openDialog(); });
      main.addEventListener('click', e => {
        const c = e.target.closest('[data-ptype]');
        if (c) { P.type = c.dataset.ptype; U.$$('[data-ptype]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.ptype === P.type))); U.$('#weekGrid').innerHTML = grid(); return; }
        const b = e.target.closest('[data-dep]');
        if (b) { P.open = P.deps.find(d => d.id === Number(b.dataset.dep)); P.creating = false; openDialog(); }
      });
    },
    // pour le tableau de bord
    computeFill
  };
})(window.TC);
