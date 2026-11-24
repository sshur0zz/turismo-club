/* Flotte : véhicules (formules, règles conducteur, équipements par code d'icône), documents et échéances, entretiens,
   kilométrage (jamais décroissant, contrôlé par la base), historique des locations et des dégâts ; réglages (lieux, distances, options).
   Tous les prix et règles sont saisis par l'agence. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const CATS = ['mini', 'economy', 'compact', 'intermediate', 'suv', 'van', 'minibus', 'luxury'], TRANS = ['manual', 'automatic'], FUELS = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg'];
  const DOCS = ['insurance', 'registration', 'inspection', 'road_tax', 'other'], LIC = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C', 'D1', 'D'];
  const S = { list: [], v: null, docs: [], maint: [], odo: [], rentals: [], damages: [], locs: [], dist: [], extras: [], setup: false };
  const opt = (v, cur, label) => `<option value="${U.esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${U.esc(label)}</option>`;
  const val = id => U.$('#' + id).value.trim();
  const intOrNull = id => { const v = val(id); return v === '' ? null : Math.round(Number(v)); };
  const centsOrNull = id => { const v = val(id); return v === '' ? null : U.cents(v); };
  const soon = d => d && d <= U.addDays(U.todayRome(), 30);
  const sec = (id, title, body) => `<section class="card pad" aria-labelledby="${id}" style="display:flex;flex-direction:column;gap:12px"><h2 id="${id}" style="font-size:16px;font-weight:800">${title}</h2>${body}</section>`;
  const fail = (id, e) => { U.$('#' + id).textContent = /P0409|diminuer|unique|duplicate/i.test(U.errMsg(e)) ? (/unique|duplicate/i.test(U.errMsg(e)) ? t('fl_plate_dup') : U.errMsg(e)) : t('save_err', { msg: U.errMsg(e) }); };

  // ---------- Liste ----------
  function listHtml() {
    const alerts = S.list.flatMap(v => (v.vehicle_documents || []).filter(d => soon(d.expires_on)).map(d => ({ v, d })));
    return U.shell('flotte', `<div class="page-head"><div><h1>${t('fl_t')}</h1><p class="sub">${t('fl_d')}</p></div><a class="btn ghost" href="#/flotte/reglages">${t('fl_setup')}</a></div>
      ${alerts.length ? `<p class="alert bad" role="status">${t('fl_alerts', { n: alerts.length })} ${alerts.map(a => `<a href="#/flotte/${a.v.id}">${U.esc(a.v.plate)}</a> (${t('fld_' + a.d.kind)} ${U.date(a.d.expires_on)})`).join(' · ')}</p>` : ''}
      <div class="grid2"><div>${S.list.length ? `<div class="tscroll"><table class="t"><caption class="sr">${t('fl_t')}</caption><thead><tr><th scope="col">${t('fl_plate')}</th><th scope="col">${t('fl_model')}</th><th scope="col">${t('fl_cat')}</th><th scope="col">${t('fl_km')}</th><th scope="col">${t('fl_state')}</th></tr></thead>
        <tbody>${S.list.map(v => `<tr${v.is_active ? '' : ' style="opacity:.6"'}><th scope="row"><a href="#/flotte/${v.id}">${U.esc(v.plate)}</a></th><td>${U.esc(v.make + ' ' + v.model)}</td><td>${t('flc_' + v.category)}</td><td>${v.odometer_km.toLocaleString(TC.locale())} km</td><td>${v.is_active ? t('fl_active') : t('sp_inactive')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">${t('fl_none')}</p>`}</div>
      <form id="vNew" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:16px;font-weight:800">${t('fl_new')}</h2>
        <div class="row"><div class="field"><label for="vn-plate">${t('fl_plate')}</label><input id="vn-plate" maxlength="12" required style="text-transform:uppercase" aria-describedby="vn-err"></div>
          <div class="field"><label for="vn-seats">${t('fl_seats')}</label><input id="vn-seats" type="number" min="1" max="60" value="5"></div></div>
        <div class="row"><div class="field"><label for="vn-make">${t('fl_make')}</label><input id="vn-make" maxlength="60" required></div><div class="field"><label for="vn-model">${t('fl_model')}</label><input id="vn-model" maxlength="60" required></div></div>
        <div class="row"><div class="field"><label for="vn-cat">${t('fl_cat')}</label><select id="vn-cat">${CATS.map(c => opt(c, 'economy', t('flc_' + c))).join('')}</select></div>
          <div class="field"><label for="vn-trans">${t('fl_trans')}</label><select id="vn-trans">${TRANS.map(c => opt(c, 'manual', t('flt_' + c))).join('')}</select></div>
          <div class="field"><label for="vn-fuel">${t('fl_fuel')}</label><select id="vn-fuel">${FUELS.map(c => opt(c, 'petrol', t('flf_' + c))).join('')}</select></div></div>
        <div class="field"><label for="vn-km">${t('fl_km')}</label><input id="vn-km" type="number" min="0" value="0"></div>
        <span class="err" id="vn-err" role="alert"></span><div><button class="btn" type="submit">${t('fl_create')}</button></div></form></div>`);
  }

  // ---------- Fiche véhicule ----------
  function sheetHtml() {
    const v = S.v;
    const info = sec('vi-h', t('fl_info'), `<form id="vInfo" novalidate style="display:flex;flex-direction:column;gap:12px">
      <div class="row"><div class="field"><label for="vi-plate">${t('fl_plate')}</label><input id="vi-plate" maxlength="12" value="${U.esc(v.plate)}" style="text-transform:uppercase"></div>
        <div class="field"><label for="vi-vin">${t('fl_vin')}</label><input id="vi-vin" maxlength="17" value="${U.esc(v.vin || '')}" style="text-transform:uppercase"></div></div>
      <div class="row"><div class="field"><label for="vi-make">${t('fl_make')}</label><input id="vi-make" maxlength="60" value="${U.esc(v.make)}"></div><div class="field"><label for="vi-model">${t('fl_model')}</label><input id="vi-model" maxlength="60" value="${U.esc(v.model)}"></div></div>
      <div class="row"><div class="field"><label for="vi-cat">${t('fl_cat')}</label><select id="vi-cat">${CATS.map(c => opt(c, v.category, t('flc_' + c))).join('')}</select></div>
        <div class="field"><label for="vi-trans">${t('fl_trans')}</label><select id="vi-trans">${TRANS.map(c => opt(c, v.transmission, t('flt_' + c))).join('')}</select></div>
        <div class="field"><label for="vi-fuel">${t('fl_fuel')}</label><select id="vi-fuel">${FUELS.map(c => opt(c, v.fuel, t('flf_' + c))).join('')}</select></div>
        <div class="field"><label for="vi-seats">${t('fl_seats')}</label><input id="vi-seats" type="number" min="1" max="60" value="${v.seats}"></div>
        <div class="field"><label for="vi-hp">${t('fl_hp')}</label><input id="vi-hp" type="number" min="1" value="${v.power_hp || ''}"></div></div>
      <div class="row"><div class="field"><label for="vi-home">${t('fl_home')}</label><select id="vi-home"><option value="">—</option>${S.locs.map(l => opt(l.id, v.home_location_id, l.name)).join('')}</select></div>
        <div class="field"><label for="vi-pol">${t('fl_fuel_pol')}</label><select id="vi-pol">${['full_to_full', 'same_to_same'].map(c => opt(c, v.fuel_policy, t('flp_' + c))).join('')}</select></div></div>
      <fieldset class="card pad" style="margin:0"><legend style="font-weight:800">${t('fl_prices')}</legend><p class="sub" style="margin:0 0 8px">${t('fl_prices_d')}</p>
        <div class="row"><div class="field"><label for="vi-day">${t('fl_flat_day')} (€)</label><input id="vi-day" inputmode="decimal" value="${U.euroIn(v.daily_price_cents)}"></div>
          <div class="field"><label for="vi-inckm">${t('fl_inc_km')}</label><input id="vi-inckm" type="number" min="0" value="${v.included_km_per_day ?? ''}"></div>
          <div class="field"><label for="vi-xkm">${t('fl_extra_km')} (€)</label><input id="vi-xkm" inputmode="decimal" value="${U.euroIn(v.extra_km_cents)}"></div></div>
        <div class="row"><div class="field"><label for="vi-kmday">${t('fl_km_day')} (€)</label><input id="vi-kmday" inputmode="decimal" value="${U.euroIn(v.km_daily_price_cents)}"></div>
          <div class="field"><label for="vi-perkm">${t('fl_per_km')} (€)</label><input id="vi-perkm" inputmode="decimal" value="${U.euroIn(v.per_km_cents)}"></div>
          <div class="field"><label for="vi-relo">${t('fl_relo')} (€/km)</label><input id="vi-relo" inputmode="decimal" value="${U.euroIn(v.relocation_per_km_cents)}"></div>
          <div class="field"><label for="vi-dep">${t('fl_deposit')} (€)</label><input id="vi-dep" inputmode="decimal" value="${U.euroIn(v.deposit_cents)}"></div></div></fieldset>
      <div class="row"><div class="field"><label for="vi-age">${t('fl_min_age')}</label><input id="vi-age" type="number" min="16" max="99" value="${v.min_driver_age ?? ''}"></div>
        <div class="field"><label for="vi-years">${t('fl_min_years')}</label><input id="vi-years" type="number" min="0" max="50" value="${v.min_license_years ?? ''}"></div>
        <div class="field"><label for="vi-lic">${t('fl_lic_cat')}</label><select id="vi-lic">${LIC.map(c => opt(c, v.license_category, c)).join('')}</select></div></div>
      <div><p style="font-weight:700;margin:0 0 6px">${t('fl_features')}</p>${TC.icons.picker('vi-feat', 'vehicle', v.features)}</div>
      <div class="field"><label for="vi-notes">${t('cl_notes')}</label><textarea id="vi-notes" maxlength="4000">${U.esc(v.notes || '')}</textarea></div>
      <label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="checkbox" id="vi-active" ${v.is_active ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('fl_active')}</label>
      <span class="err" id="vi-err" role="alert"></span><div><button class="btn" type="submit">${t('cl_save')}</button></div></form>`);
    const docs = sec('vd-h', t('fl_docs'), `${S.docs.length ? `<ul class="plain">${S.docs.map(d => `<li class="duprow"><span><strong>${t('fld_' + d.kind)}</strong>${d.expires_on ? ` · <span${soon(d.expires_on) ? ' class="late"' : ''}>${t('fl_expires', { d: U.date(d.expires_on) })}</span>` : ''}${d.note ? ' · ' + U.esc(d.note) : ''}</span><button type="button" class="btn quiet small" data-deldoc="${d.id}">${t('ho_del')}</button></li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_docs')}</p>`}
      <form id="vDoc" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="vd-kind">${t('fl_doc_kind')}</label><select id="vd-kind">${DOCS.map(c => opt(c, '', t('fld_' + c))).join('')}</select></div>
        <div class="field"><label for="vd-exp">${t('fl_doc_exp')}</label><input id="vd-exp" type="date"></div><div class="field"><label for="vd-note">${t('fl_note')}</label><input id="vd-note" maxlength="500"></div>
        <div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form>`);
    const maint = sec('vm-h', t('fl_maint'), `${S.maint.length ? `<ul class="plain">${S.maint.map(m => `<li class="duprow"><span><strong>${U.esc(m.label)}</strong> · ${m.done_on ? t('fl_done_on', { d: U.date(m.done_on) }) : (m.planned_on ? t('fl_planned', { d: U.date(m.planned_on) }) : '')}${m.km != null ? ' · ' + m.km.toLocaleString(TC.locale()) + ' km' : ''}${m.cost_cents != null ? ' · ' + U.eur(m.cost_cents) : ''}</span>
        ${m.done_on ? '' : `<button type="button" class="btn ghost small" data-mdone="${m.id}">${t('fl_mark_done')}</button>`}</li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_maint')}</p>`}
      <form id="vMaint" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="vm-label">${t('fl_maint_label')}</label><input id="vm-label" maxlength="200" required></div>
        <div class="field"><label for="vm-plan">${t('fl_planned_on')}</label><input id="vm-plan" type="date"></div><div class="field"><label for="vm-cost">${t('fl_cost')} (€)</label><input id="vm-cost" inputmode="decimal"></div>
        <div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form>`);
    const odo = sec('vo-h', t('fl_odo'), `<p style="margin:0"><strong>${v.odometer_km.toLocaleString(TC.locale())} km</strong></p>
      ${S.odo.length ? `<p class="sub" style="margin:0">${S.odo.slice(0, 8).map(o => `${U.dateTime(o.read_at)} : ${o.km.toLocaleString(TC.locale())} km (${t('flo_' + o.source)})`).join(' · ')}</p>` : ''}
      <form id="vOdo" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="vo-km">${t('fl_new_reading')}</label><input id="vo-km" type="number" min="0" required aria-describedby="vo-err"></div><div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form>
      <span class="err" id="vo-err" role="alert"></span>`);
    const rent = sec('vr-h', t('fl_rentals'), S.rentals.length ? `<ul class="plain">${S.rentals.map(r => `<li><a href="#/locations/${r.id}"><strong>${U.esc(r.reference)}</strong></a> · ${U.dateTime(r.starts_at)} → ${U.dateTime(r.ends_at)} · <span class="badge rs-${r.status}">${t('rs_' + r.status)}</span></li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_rentals')}</p>`);
    const zones = {}; S.damages.forEach(d => { (zones[d.zone] = zones[d.zone] || []).push(d); });
    const dmg = sec('vg-h', t('fl_damages'), Object.keys(zones).length ? `<ul class="plain">${Object.entries(zones).map(([z, list]) => `<li><strong>${U.esc(TC.carZones.label(z))}</strong> : ${list.map(d => `${t('dmg_' + d.type)} (${U.esc(d.ref)} · ${t('ik_' + d.kind)} ${U.date(d.at)})`).join(' · ')}</li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_damage')}</p>`);
    return U.shell('flotte', `<p style="margin:0 0 10px"><a href="#/flotte">${t('fl_back')}</a></p>
      <div class="page-head"><div><h1>${U.esc(v.plate)} · ${U.esc(v.make + ' ' + v.model)}</h1><p class="sub">${t('flc_' + v.category)} · ${t('flt_' + v.transmission)} · ${t('flf_' + v.fuel)} · ${v.seats} ${t('fl_seats').toLowerCase()} ${TC.icons.chips(v.features)}</p></div></div>
      <div class="grid2"><div class="stack">${info}</div><div class="stack">${odo}${docs}${maint}${rent}${dmg}</div></div>`);
  }

  // ---------- Réglages ----------
  function setupHtml() {
    const name = id => (S.locs.find(l => l.id === id) || {}).name || '';
    return U.shell('flotte', `<p style="margin:0 0 10px"><a href="#/flotte">${t('fl_back')}</a></p><div class="page-head"><div><h1>${t('fl_setup')}</h1><p class="sub">${t('fl_setup_d')}</p></div></div>
      <div class="grid2"><div class="stack">
        ${sec('sl-h', t('fl_locs'), `${S.locs.length ? `<ul class="plain">${S.locs.map(l => `<li><strong>${U.esc(l.name)}</strong>${l.address ? ' · ' + U.esc(l.address) : ''}</li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_locs')}</p>`}
          <form id="sLoc" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="sl-name">${t('fl_loc_name')}</label><input id="sl-name" maxlength="120" required></div><div class="field"><label for="sl-addr">${t('sp_address')}</label><input id="sl-addr" maxlength="300"></div><div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form><span class="err" id="sl-err" role="alert"></span>`)}
        ${S.locs.length > 1 ? sec('sd-h', t('fl_dist'), `<p class="sub" style="margin:0">${t('fl_dist_d')}</p>${S.dist.length ? `<ul class="plain">${S.dist.map(d => `<li>${U.esc(name(d.from_id))} → ${U.esc(name(d.to_id))} : <strong>${d.km} km</strong></li>`).join('')}</ul>` : ''}
          <form id="sDist" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="sd-from">${t('fl_from')}</label><select id="sd-from">${S.locs.map(l => opt(l.id, '', l.name)).join('')}</select></div><div class="field"><label for="sd-to">${t('fl_to')}</label><select id="sd-to">${S.locs.map((l, i) => opt(l.id, (S.locs[1] || {}).id, l.name)).join('')}</select></div>
            <div class="field"><label for="sd-km">km</label><input id="sd-km" type="number" min="0" required></div><div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form><span class="err" id="sd-err" role="alert"></span>`) : ''}
      </div><div class="stack">
        ${sec('se-h', t('fl_extras'), `${S.extras.length ? `<ul class="plain">${S.extras.map(x => `<li class="duprow"><span>${x.icon ? TC.icons.svg(x.icon, 16) : ''} <strong>${U.esc(x.name)}</strong> · ${U.eur(x.price_cents)} ${t('fle_' + x.per)}${x.is_active ? '' : ' · ' + t('sp_inactive')}</span><button type="button" class="btn ghost small" data-xtoggle="${x.id}">${x.is_active ? t('fl_deactivate') : t('fl_activate')}</button></li>`).join('')}</ul>` : `<p class="sub">${t('fl_no_extras')}</p>`}
          <form id="sExtra" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="se-name">${t('fl_extra_name')}</label><input id="se-name" maxlength="120" required></div><div class="field"><label for="se-price">${t('fl_price')} (€)</label><input id="se-price" inputmode="decimal" required></div>
            <div class="field"><label for="se-per">${t('fl_per')}</label><select id="se-per">${['day', 'rental'].map(c => opt(c, 'day', t('fle_' + c))).join('')}</select></div>
            <div class="field"><label for="se-icon">${t('fl_icon')}</label><select id="se-icon"><option value="">—</option>${TC.icons.forScope('vehicle').map(c => opt(c, '', TC.icons.label(c))).join('')}</select></div><div><button class="btn ghost" type="submit">${t('fl_add')}</button></div></form><span class="err" id="se-err" role="alert"></span>`)}
      </div></div>`);
  }

  async function loadSheet(id) {
    const [v, docs, maint, odo, rentals, locs] = await Promise.all([
      TC.api.sel('vehicles', '*', q => q.eq('id', id).maybeSingle()), TC.api.sel('vehicle_documents', '*', q => q.eq('vehicle_id', id).order('expires_on')),
      TC.api.sel('vehicle_maintenance', '*', q => q.eq('vehicle_id', id).order('done_on', { nullsFirst: true }).order('planned_on')), TC.api.sel('vehicle_odometer', '*', q => q.eq('vehicle_id', id).order('read_at', { ascending: false }).limit(20)),
      TC.api.sel('rental_contracts', 'id,reference,status,starts_at,ends_at,inspections(kind,signed_at,inspection_damages(zone,type))', q => q.eq('vehicle_id', id).order('starts_at', { ascending: false }).limit(100)),
      TC.api.sel('rental_locations', '*', q => q.order('name'))]);
    Object.assign(S, { v, docs, maint, odo, rentals, locs });
    S.damages = rentals.flatMap(r => (r.inspections || []).filter(i => i.signed_at).flatMap(i => i.inspection_damages.map(d => ({ ...d, kind: i.kind, at: i.signed_at, ref: r.reference }))));
  }
  const again = async msg => { if (msg) U.toast(msg); await TC.views.flotte.load(location.hash.split('/').slice(2)); TC.render(true); };

  TC.views.flotte = {
    load: async params => {
      S.setup = params && params[0] === 'reglages'; S.v = null;
      if (S.setup) { [S.locs, S.dist, S.extras] = await Promise.all([TC.api.sel('rental_locations', '*', q => q.order('name')), TC.api.sel('rental_location_distances', '*'), TC.api.sel('rental_extras', '*', q => q.order('name'))]); return; }
      if (params && params[0]) { await loadSheet(Number(params[0])); return; }
      S.list = await TC.api.sel('vehicles', 'id,plate,make,model,category,odometer_km,is_active,vehicle_documents(kind,expires_on)', q => q.order('plate'));
    },
    html: () => S.setup ? setupHtml() : S.v ? sheetHtml() : (location.hash.split('/')[2] ? U.shell('flotte', `<p class="empty">${t('not_found')}</p>`) : listHtml()),
    bind: () => {
      const main = U.$('#main'), on = (id, fn) => { const f = U.$('#' + id); if (f) f.addEventListener('submit', e => { e.preventDefault(); fn(f); }); };
      on('vNew', async () => {
        const row = { plate: val('vn-plate').toUpperCase(), make: val('vn-make'), model: val('vn-model'), category: val('vn-cat'), transmission: val('vn-trans'), fuel: val('vn-fuel'), seats: intOrNull('vn-seats'), odometer_km: intOrNull('vn-km') || 0 };
        if (!/^[A-Z0-9 -]{4,12}$/.test(row.plate) || !row.make || !row.model) { U.$('#vn-err').textContent = t('fl_need'); U.$('#vn-plate').focus(); return; }
        try { const v = await TC.api.ins('vehicles', row); location.hash = '#/flotte/' + v.id; } catch (e) { fail('vn-err', e); }
      });
      on('vInfo', async () => {
        const v = S.v, next = { plate: val('vi-plate').toUpperCase(), vin: val('vi-vin').toUpperCase() || null, make: val('vi-make'), model: val('vi-model'), category: val('vi-cat'), transmission: val('vi-trans'), fuel: val('vi-fuel'),
          seats: intOrNull('vi-seats'), power_hp: intOrNull('vi-hp'), home_location_id: intOrNull('vi-home'), fuel_policy: val('vi-pol'), daily_price_cents: centsOrNull('vi-day'), included_km_per_day: intOrNull('vi-inckm'),
          extra_km_cents: centsOrNull('vi-xkm'), km_daily_price_cents: centsOrNull('vi-kmday'), per_km_cents: centsOrNull('vi-perkm'), relocation_per_km_cents: centsOrNull('vi-relo'), deposit_cents: centsOrNull('vi-dep'),
          min_driver_age: intOrNull('vi-age'), min_license_years: intOrNull('vi-years'), license_category: val('vi-lic'), features: TC.icons.picked(U.$('#vInfo'), 'vi-feat'), notes: val('vi-notes'), is_active: U.$('#vi-active').checked };
        if ([next.daily_price_cents, next.extra_km_cents, next.km_daily_price_cents, next.per_km_cents, next.relocation_per_km_cents, next.deposit_cents].some(x => x !== null && !Number.isFinite(x))) { U.$('#vi-err').textContent = t('ho_num_bad'); return; }
        if (next.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(next.vin)) { U.$('#vi-err').textContent = t('fl_vin_bad'); U.$('#vi-vin').focus(); return; }
        const p = U.patchOf(v, next); if (!Object.keys(p).length) { U.toast(t('cl_nochange')); return; }
        try { await TC.api.upd('vehicles', v.id, p); await again(t('saved')); } catch (e) { fail('vi-err', e); }
      });
      on('vDoc', async () => { try { await TC.api.ins('vehicle_documents', { vehicle_id: S.v.id, kind: val('vd-kind'), expires_on: val('vd-exp') || null, note: val('vd-note') || null }); await again(t('saved')); } catch (e) { U.toast(t('save_err', { msg: U.errMsg(e) })); } });
      on('vMaint', async () => { if (!val('vm-label')) { U.$('#vm-label').focus(); return; } const c = centsOrNull('vm-cost');
        try { await TC.api.ins('vehicle_maintenance', { vehicle_id: S.v.id, label: val('vm-label'), planned_on: val('vm-plan') || null, cost_cents: Number.isFinite(c) ? c : null }); await again(t('saved')); } catch (e) { U.toast(t('save_err', { msg: U.errMsg(e) })); } });
      on('vOdo', async () => { const km = intOrNull('vo-km'); if (km == null) { U.$('#vo-km').focus(); return; }
        try { await TC.api.ins('vehicle_odometer', { vehicle_id: S.v.id, km }); await again(t('saved')); } catch (e) { fail('vo-err', e); } });
      on('sLoc', async () => { if (!val('sl-name')) { U.$('#sl-name').focus(); return; } try { await TC.api.ins('rental_locations', { name: val('sl-name'), address: val('sl-addr') || null }); await again(t('saved')); } catch (e) { fail('sl-err', e); } });
      on('sDist', async () => { const from = intOrNull('sd-from'), to = intOrNull('sd-to'), km = intOrNull('sd-km'); if (from === to || km == null) { U.$('#sd-err').textContent = t('fl_dist_bad'); return; }
        try { await TC.api.upsert('rental_location_distances', [{ from_id: from, to_id: to, km }, { from_id: to, to_id: from, km }], 'from_id,to_id'); await again(t('saved')); } catch (e) { fail('sd-err', e); } });
      on('sExtra', async () => { const price = U.cents(val('se-price')); if (!val('se-name') || !Number.isFinite(price) || price < 0) { U.$('#se-err').textContent = t('ho_num_bad'); return; }
        try { await TC.api.ins('rental_extras', { name: val('se-name'), price_cents: price, per: val('se-per'), icon: val('se-icon') || null }); await again(t('saved')); } catch (e) { fail('se-err', e); } });
      main.addEventListener('click', async e => {
        const b = e.target.closest('[data-deldoc],[data-mdone],[data-xtoggle]'); if (!b) return;
        try {
          if (b.dataset.deldoc && confirm(t('ho_del_confirm'))) await TC.api.del('vehicle_documents', Number(b.dataset.deldoc));
          if (b.dataset.mdone) await TC.api.upd('vehicle_maintenance', Number(b.dataset.mdone), { done_on: U.todayRome(), km: S.v.odometer_km });
          if (b.dataset.xtoggle) { const x = S.extras.find(y => y.id === Number(b.dataset.xtoggle)); await TC.api.upd('rental_extras', x.id, { is_active: !x.is_active }); }
          await again(t('saved'));
        } catch (err) { U.toast(t('save_err', { msg: U.errMsg(err) })); }
      });
    }
  };
})(window.TC);
