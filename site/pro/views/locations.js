/* Locations : contrats (total calculé par la base, chevauchements refusés par la base, contrôles du permis),
   états des lieux départ / retour (photos obligatoires compressées dans le navigateur, schéma du véhicule à zones cliquables
   avec alternative clavier, dégâts typés, signature tactile, figé après signature) et comparaison départ / retour.
   Frais de carburant et de dégâts : saisis par l'agent (aucun barème). */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const SIDES = ['front', 'back', 'left', 'right', 'interior', 'dashboard'];
  const TYPES = ['scratch', 'dent', 'chip', 'crack', 'broken', 'stain', 'burn', 'tear', 'missing', 'to_replace'];
  const LIC = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C', 'D1', 'D'];

  // ---------- Zones du véhicule (vue de dessus, avant en haut) ----------
  const Z = [
    ['front_bumper', 40, 6, 140, 20], ['headlight_left', 40, 26, 30, 10], ['headlight_right', 150, 26, 30, 10], ['hood', 50, 38, 120, 66], ['windshield', 55, 106, 110, 26],
    ['roof', 55, 134, 110, 118], ['rear_window', 55, 254, 110, 24], ['trunk', 50, 280, 120, 64], ['taillight_left', 40, 346, 30, 10], ['taillight_right', 150, 346, 30, 10],
    ['rear_bumper', 40, 358, 140, 20], ['left_front_fender', 16, 40, 32, 68], ['left_front_door', 16, 110, 32, 78], ['left_rear_door', 16, 190, 32, 78], ['left_rear_fender', 16, 270, 32, 72],
    ['right_front_fender', 172, 40, 32, 68], ['right_front_door', 172, 110, 32, 78], ['right_rear_door', 172, 190, 32, 78], ['right_rear_fender', 172, 270, 32, 72],
    ['wheel_front_left', 0, 56, 14, 40], ['wheel_front_right', 206, 56, 14, 40], ['wheel_rear_left', 0, 286, 14, 40], ['wheel_rear_right', 206, 286, 14, 40],
    ['mirror_left', 2, 112, 12, 14], ['mirror_right', 206, 112, 12, 14]];
  const OTHER = ['interior_front', 'interior_rear', 'dashboard_zone', 'spare_wheel', 'keys_docs'];
  TC.carZones = { all: [...Z.map(z => z[0]), ...OTHER], label: z => t('zone_' + z) };
  function diagram(dmgDep, dmgRet, interactive) {
    const cls = z => dmgRet && dmgRet.some(d => d.zone === z) ? (dmgDep.some(d => d.zone === z) ? 'z-old' : 'z-new') : (dmgDep.some(d => d.zone === z) ? 'z-old' : '');
    return `<svg viewBox="0 0 220 384" class="cardiag" role="${interactive ? 'group' : 'img'}" aria-label="${t('ins_diag')}" style="max-width:240px;width:100%">
      <rect x="14" y="24" width="192" height="336" rx="40" fill="#F4F1EE" stroke="#CFC7C0"/>
      ${Z.map(([z, x, y, w, h]) => `<rect class="zone ${cls(z)}" data-zone="${z}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${interactive ? `tabindex="0" role="button" aria-label="${U.esc(t('zone_' + z))}"` : ''}><title>${U.esc(t('zone_' + z))}</title></rect>`).join('')}</svg>
      ${interactive ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${OTHER.map(z => `<button type="button" class="chip ${cls(z)}" data-zone="${z}">${t('zone_' + z)}</button>`).join('')}</div>` : ''}`;
  }

  // ---------- Photos : compression dans le navigateur (jamais de SVG, type réel image) ----------
  async function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(t('ins_photo_type'));
    const img = await createImageBitmap(file); const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.72));
  }
  async function upload(path, blob, type = 'image/jpeg') { const { error } = await TC.api.sb.storage.from('flotte').upload(path, blob, { contentType: type, upsert: false }); if (error) throw error; return path; }
  const urls = {};
  async function signed(paths) {
    const need = paths.filter(p => p && !urls[p]); if (!need.length) return;
    const { data } = await TC.api.sb.storage.from('flotte').createSignedUrls(need, 3600); (data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }

  const S = { list: [], c: null, ins: {}, vehicles: [], customers: [], locs: [], extras: [], zone: null, mode: 'list' };
  const opt = (v, cur, label) => `<option value="${U.esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${U.esc(label)}</option>`;
  const val = id => U.$('#' + id).value.trim();
  const errMsg = e => { const m = U.errMsg(e); return /rental_no_overlap|exclusion/i.test(m) ? t('rl_overlap') : m; };
  const full = c => c ? [c.first_name, c.last_name].filter(Boolean).join(' ') : '';

  // ---------- Liste ----------
  function listHtml() {
    return U.shell('locations', `<div class="page-head"><div><h1>${t('rl_t')}</h1><p class="sub">${t('rl_d')}</p></div><a class="btn" href="#/locations/nouveau">${t('rl_new')}</a></div>
      ${S.list.length ? `<div class="tscroll"><table class="t"><caption class="sr">${t('rl_t')}</caption><thead><tr><th scope="col">${t('rl_ref')}</th><th scope="col">${t('rl_vehicle')}</th><th scope="col">${t('rl_client')}</th><th scope="col">${t('rl_dates')}</th><th scope="col">${t('rl_total')}</th><th scope="col">${t('fl_state')}</th></tr></thead>
        <tbody>${S.list.map(r => `<tr><th scope="row"><a href="#/locations/${r.id}">${U.esc(r.reference)}</a></th><td>${U.esc(r.vehicle ? r.vehicle.plate + ' · ' + r.vehicle.model : '')}</td><td>${U.esc(full(r.customer))}</td>
          <td>${U.dateTime(r.starts_at)} → ${U.dateTime(r.ends_at)}</td><td>${U.eur(r.total_cents)}</td><td><span class="badge rs-${r.status}">${t('rs_' + r.status)}</span></td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">${t('rl_none')}</p>`}`);
  }

  // ---------- Nouveau contrat ----------
  function newHtml() {
    const today = U.todayRome();
    return U.shell('locations', `<p style="margin:0 0 10px"><a href="#/locations">${t('rl_back')}</a></p><div class="page-head"><div><h1>${t('rl_new')}</h1><p class="sub">${t('rl_new_d')}</p></div></div>
      <form id="rlNew" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px;max-width:900px">
        <div class="row"><div class="field"><label for="rn-veh">${t('rl_vehicle')}</label><select id="rn-veh">${S.vehicles.map(v => opt(v.id, '', `${v.plate} · ${v.make} ${v.model}`)).join('')}</select></div>
          <div class="field"><label for="rn-cust">${t('rl_client')}</label><select id="rn-cust"><option value="">${t('rl_new_client')}</option>${S.customers.map(c => opt(c.id, '', full(c) + (c.email ? ' · ' + c.email : ''))).join('')}</select></div></div>
        <div class="row" id="rn-newc"><div class="field"><label for="rn-cf">${t('cl_first')}</label><input id="rn-cf" maxlength="200"></div><div class="field"><label for="rn-cl">${t('cl_last')}</label><input id="rn-cl" maxlength="200"></div>
          <div class="field"><label for="rn-ce">${t('email')}</label><input id="rn-ce" type="email" maxlength="200"></div><div class="field"><label for="rn-cp">${t('n_phone')}</label><input id="rn-cp" type="tel" maxlength="50"></div></div>
        <div class="row"><div class="field"><label for="rn-sd">${t('rl_start')}</label><input id="rn-sd" type="date" min="${today}" required></div><div class="field"><label for="rn-st">${t('rl_time')}</label><input id="rn-st" type="time" value="09:00"></div>
          <div class="field"><label for="rn-ed">${t('rl_end')}</label><input id="rn-ed" type="date" min="${today}" required></div><div class="field"><label for="rn-et">${t('rl_time')}</label><input id="rn-et" type="time" value="09:00"></div></div>
        <div class="row"><div class="field"><label for="rn-pick">${t('rl_pickup')}</label><select id="rn-pick"><option value="">—</option>${S.locs.map(l => opt(l.id, '', l.name)).join('')}</select></div>
          <div class="field"><label for="rn-ret">${t('rl_return')}</label><select id="rn-ret"><option value="">—</option>${S.locs.map(l => opt(l.id, '', l.name)).join('')}</select></div>
          <div class="field"><label for="rn-form">${t('rl_formula')}</label><select id="rn-form"><option value="flat">${t('rl_flat')}</option><option value="km">${t('rl_km')}</option></select></div></div>
        ${S.extras.length ? `<fieldset style="border:none;margin:0;padding:0"><legend style="font-weight:700;margin-bottom:6px">${t('fl_extras')}</legend><div style="display:flex;flex-wrap:wrap;gap:8px">${S.extras.map(x => `<label class="ipick"><input type="checkbox" name="rn-x" value="${x.id}">${x.icon ? TC.icons.svg(x.icon, 18) : ''}<span>${U.esc(x.name)} · ${U.eur(x.price_cents)} ${t('fle_' + x.per)}</span></label>`).join('')}</div></fieldset>` : ''}
        <fieldset class="card pad" style="margin:0"><legend style="font-weight:800">${t('rl_driver')}</legend>
          <div class="row"><div class="field"><label for="rn-dn">${t('rl_driver_name')}</label><input id="rn-dn" maxlength="200" required></div><div class="field"><label for="rn-db">${t('rl_birth')}</label><input id="rn-db" type="date" required></div></div>
          <div class="row"><div class="field"><label for="rn-ln">${t('rl_lic_no')}</label><input id="rn-ln" maxlength="40" required autocomplete="off"></div><div class="field"><label for="rn-lc">${t('fl_lic_cat')}</label><select id="rn-lc">${LIC.map(c => opt(c, 'B', c)).join('')}</select></div>
            <div class="field"><label for="rn-li">${t('rl_lic_issued')}</label><input id="rn-li" type="date" required></div><div class="field"><label for="rn-le">${t('rl_lic_exp')}</label><input id="rn-le" type="date" required></div></div>
          <div class="field"><label for="rn-d2">${t('rl_driver2')}</label><input id="rn-d2" maxlength="200"></div></fieldset>
        <div class="field"><label for="rn-notes">${t('cl_notes')}</label><textarea id="rn-notes" maxlength="2000"></textarea></div>
        <span class="err" id="rn-err" role="alert"></span><div><button class="btn" type="submit">${t('rl_create')}</button></div></form>`);
  }

  // ---------- Contrat ----------
  function insPanel(kind) {
    const c = S.c, ins = S.ins[kind], other = S.ins.departure;
    if (!ins) {
      const can = kind === 'departure' ? c.status === 'booked' : c.status === 'active';
      return `<section class="card pad" aria-labelledby="ip-${kind}"><h2 id="ip-${kind}" style="font-size:16px;font-weight:800">${t('ins_' + kind)}</h2>${can ? `<button type="button" class="btn" data-ins-start="${kind}">${t('ins_start')}</button>` : `<p class="sub">${t('ins_not_yet')}</p>`}</section>`;
    }
    const signed = !!ins.signed_at, photos = ins.inspection_photos || [], dmg = ins.inspection_damages || [];
    const depDmg = kind === 'return' && other ? other.inspection_damages || [] : dmg;
    return `<section class="card pad" aria-labelledby="ip-${kind}" style="display:flex;flex-direction:column;gap:12px" data-ins="${ins.id}">
      <h2 id="ip-${kind}" style="font-size:16px;font-weight:800">${t('ins_' + kind)} ${signed ? `<span class="badge st-won">${t('ins_signed', { d: U.dateTime(ins.signed_at), n: ins.signed_by_name })}</span>` : ''}</h2>
      <div class="row"><div class="field"><label for="ik-${kind}">${t('ins_km')}</label><input id="ik-${kind}" type="number" min="0" value="${ins.km ?? ''}" ${signed ? 'readonly' : ''}></div>
        <div class="field"><label for="if-${kind}">${t('ins_fuel')}</label><select id="if-${kind}" ${signed ? 'disabled' : ''}><option value="">—</option>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => opt(n, ins.fuel_eighths, n + '/8')).join('')}</select></div>
        ${signed ? '' : `<div style="align-self:flex-end"><button type="button" class="btn ghost" data-ins-save="${kind}">${t('cl_save')}</button></div>`}</div>
      <div><p style="font-weight:700;margin:0 0 6px">${t('ins_photos')}</p><div class="photogrid">${SIDES.map(s => { const p = photos.find(x => x.side === s);
        return `<div class="ph">${p && urls[p.path] ? `<img src="${U.esc(urls[p.path])}" alt="${U.esc(t('side_' + s))}">` : `<span class="phmiss">${t('ins_missing')}</span>`}<span>${t('side_' + s)}</span>
          ${signed ? '' : `<label class="btn ghost small" style="cursor:pointer">${p ? t('ins_add_more') : t('ins_take')}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-photo="${kind}:${s}" class="sr"></label>`}</div>`; }).join('')}</div></div>
      <div class="insgrid"><div>${diagram(kind === 'return' ? depDmg : dmg, kind === 'return' ? dmg : null, !signed)}</div>
        <div><p style="font-weight:700;margin:0 0 6px">${t('ins_damages')}</p>${dmg.length ? `<ul class="plain">${dmg.map(d => `<li class="duprow"><span><strong>${U.esc(TC.carZones.label(d.zone))}</strong> · ${t('dmg_' + d.type)}${d.note ? ' · ' + U.esc(d.note) : ''}${kind === 'return' && !depDmg.some(x => x.zone === d.zone) ? ` <span class="badge st-lost">${t('ins_new')}</span>` : ''}</span>${d.photo_path && urls[d.photo_path] ? `<a href="${U.esc(urls[d.photo_path])}" target="_blank" rel="noopener">${t('ins_photo')}</a>` : ''}</li>`).join('')}</ul>` : `<p class="sub">${t('ins_no_damage')}</p>`}
        ${signed ? '' : `<form data-dmg-form="${kind}" novalidate style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:10px;margin-top:8px">
          <p class="sub" style="margin:0" aria-live="polite">${S.zone && S.zone.kind === kind ? t('ins_zone_sel', { z: TC.carZones.label(S.zone.z) }) : t('ins_zone_pick')}</p>
          <div class="row"><div class="field"><label for="dt-${kind}">${t('ins_dmg_type')}</label><select id="dt-${kind}">${TYPES.map(x => opt(x, '', t('dmg_' + x))).join('')}</select></div>
            <div class="field"><label for="dn-${kind}">${t('fl_note')}</label><input id="dn-${kind}" maxlength="500"></div></div>
          <label class="btn ghost small" style="cursor:pointer;align-self:flex-start">${t('ins_dmg_photo')}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" id="dp-${kind}" class="sr"></label>
          <div><button class="btn ghost" type="submit">${t('ins_dmg_add')}</button></div></form>`}</div></div>
      ${signed ? (ins.signature_path && urls[ins.signature_path] ? `<img src="${U.esc(urls[ins.signature_path])}" alt="${U.esc(t('ins_signature'))}" style="max-width:260px;border:1px solid var(--line);border-radius:8px">` : '')
        : `<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:10px"><p style="font-weight:700;margin:0">${t('ins_sign_t')}</p><p class="sub" style="margin:0">${t('ins_sign_d')}</p>
          <canvas width="520" height="160" class="sigpad" data-sig="${kind}" aria-label="${t('ins_signature')}" role="img"></canvas>
          <div class="row"><div class="field"><label for="sn-${kind}">${t('ins_signer')}</label><input id="sn-${kind}" maxlength="200" value="${U.esc(c.driver_name)}"></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn quiet small" data-sig-clear="${kind}">${t('ins_sig_clear')}</button><button type="button" class="btn" data-ins-sign="${kind}">${t('ins_sign_b')}</button></div></div>`}
      <span class="err" id="ie-${kind}" role="alert"></span></section>`;
  }
  function compareHtml() {
    const d = S.ins.departure, r = S.ins.return; if (!d || !r || !d.signed_at || !r.signed_at) return '';
    const dz = d.inspection_damages || [], rz = r.inspection_damages || [], c = S.c;
    const pic = (ins, s) => { const p = (ins.inspection_photos || []).find(x => x.side === s); return p && urls[p.path] ? `<img src="${U.esc(urls[p.path])}" alt="">` : '—'; };
    return `<section class="card pad" aria-labelledby="cmp-h" style="display:flex;flex-direction:column;gap:12px"><h2 id="cmp-h" style="font-size:16px;font-weight:800">${t('cmp_t')}</h2>
      <p style="margin:0">${t('cmp_km', { n: (r.km - d.km).toLocaleString(TC.locale()) })} · ${t('cmp_fuel', { a: d.fuel_eighths, b: r.fuel_eighths })}${r.fuel_eighths < d.fuel_eighths ? ` <span class="badge st-lost">${t('cmp_fuel_less')}</span>` : ''}</p>
      <p style="margin:0">${t('cmp_new', { n: rz.filter(x => !dz.some(y => y.zone === x.zone)).length })}</p>
      <div class="tscroll"><table class="t"><thead><tr><th scope="col">${t('cmp_side')}</th><th scope="col">${t('ins_departure')}</th><th scope="col">${t('ins_return')}</th></tr></thead>
        <tbody>${SIDES.map(s => `<tr><th scope="row">${t('side_' + s)}</th><td class="cmpimg">${pic(d, s)}</td><td class="cmpimg">${pic(r, s)}</td></tr>`).join('')}</tbody></table></div>
      ${c.status === 'active' ? `<form id="feeForm" novalidate class="row" style="align-items:flex-end"><div class="field"><label for="fe-fuel">${t('cmp_fuel_fee')} (€)</label><input id="fe-fuel" inputmode="decimal" value="${U.euroIn(c.fuel_fee_cents)}"></div>
        <div class="field"><label for="fe-dmg">${t('cmp_dmg_fee')} (€)</label><input id="fe-dmg" inputmode="decimal" value="${U.euroIn(c.damage_fee_cents)}"></div><div><button class="btn ghost" type="submit">${t('cl_save')}</button></div></form><p class="sub" style="margin:0">${t('cmp_fee_d')}</p>` : ''}</section>`;
  }
  function sheetHtml() {
    const c = S.c;
    const lines = [[t('rl_days_line', { n: c.days, p: U.eur(c.daily_price_cents) }), c.days * c.daily_price_cents], ...(c.extras || []).map(x => [`${x.name} × ${x.qty}${x.per === 'day' ? ' × ' + c.days + ' j' : ''}`, x.total_cents]),
      c.relocation_cents ? [t('rl_relo'), c.relocation_cents] : null, c.km_fee_cents ? [t('rl_km_fee'), c.km_fee_cents] : null, c.fuel_fee_cents ? [t('cmp_fuel_fee'), c.fuel_fee_cents] : null, c.damage_fee_cents ? [t('cmp_dmg_fee'), c.damage_fee_cents] : null].filter(Boolean);
    return U.shell('locations', `<p style="margin:0 0 10px"><a href="#/locations">${t('rl_back')}</a></p>
      <div class="page-head"><div><h1>${U.esc(c.reference)} <span class="badge rs-${c.status}">${t('rs_' + c.status)}</span></h1>
        <p class="sub"><a href="#/flotte/${c.vehicle.id}">${U.esc(c.vehicle.plate + ' · ' + c.vehicle.make + ' ' + c.vehicle.model)}</a> · <a href="#/clients/${c.customer.id}">${U.esc(full(c.customer))}</a> · ${U.dateTime(c.starts_at)} → ${U.dateTime(c.ends_at)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${c.status === 'booked' ? `<button type="button" class="btn" data-rl="active">${t('rl_handover')}</button><button type="button" class="btn quiet" data-rl="cancelled">${t('rl_cancel')}</button>` : ''}
          ${c.status === 'active' ? `<button type="button" class="btn" data-rl="returned">${t('rl_close')}</button>` : ''}<button type="button" class="btn ghost" id="rlPrint">${t('vo_print')}</button></div></div>
      <span class="err" id="rl-err" role="alert"></span>
      <div class="grid2"><div class="stack">${insPanel('departure')}${c.status !== 'booked' ? insPanel('return') : ''}${compareHtml()}</div>
      <div class="stack"><section class="card pad" aria-labelledby="rt-h"><h2 id="rt-h" style="font-size:16px;font-weight:800">${t('rl_total')}</h2>
          <table class="t"><tbody>${lines.map(([l, v]) => `<tr><td>${U.esc(l)}</td><td class="num">${U.eur(v)}</td></tr>`).join('')}</tbody><tfoot><tr><td>${t('rl_total')}</td><td class="num">${U.eur(c.total_cents)}</td></tr></tfoot></table>
          <p class="sub">${t('rl_formula')} : ${t(c.formula === 'flat' ? 'rl_flat' : 'rl_km')}${c.formula === 'flat' && c.included_km_per_day != null ? ' · ' + t('rl_inc', { n: c.included_km_per_day, p: U.eur(c.extra_km_cents) }) : ''}${c.formula === 'km' ? ' · ' + U.eur(c.per_km_cents) + ' / km' : ''}${c.deposit_cents != null ? ' · ' + t('fl_deposit') + ' ' + U.eur(c.deposit_cents) : ''}</p></section>
        <section class="card pad" aria-labelledby="rd-h"><h2 id="rd-h" style="font-size:16px;font-weight:800">${t('rl_driver')}</h2>
          <p style="margin:0">${U.esc(c.driver_name)} · ${t('rl_birth')} ${U.date(c.driver_birthdate)}<br>${t('rl_lic_no')} ${U.esc(c.license_number)} (${U.esc(c.license_category)}) · ${t('rl_lic_issued')} ${U.date(c.license_issued_on)} · ${t('rl_lic_exp')} ${U.date(c.license_expires_on)}${c.second_driver_name ? '<br>' + t('rl_driver2') + ' : ' + U.esc(c.second_driver_name) : ''}</p>
          <label style="display:flex;gap:8px;align-items:center;min-height:44px;font-weight:700"><input type="checkbox" id="rl-lic" ${c.license_original_checked ? 'checked' : ''} ${c.status !== 'booked' ? 'disabled' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('rl_lic_checked')}</label></section></div></div>`);
  }

  async function loadContract(id) {
    S.c = await TC.api.sel('rental_contracts', '*, vehicle:vehicles(id,plate,make,model), customer:customers(id,first_name,last_name,email,phone)', q => q.eq('id', id).maybeSingle());
    const ins = S.c ? await TC.api.sel('inspections', '*, inspection_photos(*), inspection_damages(*)', q => q.eq('contract_id', id)) : [];
    S.ins = Object.fromEntries(ins.map(i => [i.kind, i]));
    await signed(ins.flatMap(i => [...(i.inspection_photos || []).map(p => p.path), ...(i.inspection_damages || []).map(d => d.photo_path), i.signature_path]));
  }
  const again = async msg => { if (msg) U.toast(msg); await loadContract(S.c.id); TC.render(true); };

  // Signature tactile (pointeur : souris, doigt, stylet)
  function bindPad(cv) {
    const ctx = cv.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827'; let down = false; cv.dataset.inked = '';
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
    cv.addEventListener('pointermove', e => { if (!down) return; ctx.lineTo(...pos(e)); ctx.stroke(); cv.dataset.inked = '1'; });
    cv.addEventListener('pointerup', () => { down = false; });
  }

  TC.views.locations = {
    load: async params => {
      S.mode = !params || !params[0] ? 'list' : params[0] === 'nouveau' ? 'new' : 'sheet'; S.zone = null; S.newCustomer = null;
      if (S.mode === 'list') S.list = await TC.api.sel('rental_contracts', 'id,reference,status,starts_at,ends_at,total_cents,vehicle:vehicles(plate,model),customer:customers(first_name,last_name)', q => q.order('starts_at', { ascending: false }).limit(300));
      if (S.mode === 'new') [S.vehicles, S.customers, S.locs, S.extras] = await Promise.all([TC.api.sel('vehicles', 'id,plate,make,model', q => q.eq('is_active', true).order('plate')),
        TC.api.sel('customers', 'id,first_name,last_name,email', q => q.is('merged_into_id', null).order('first_name').limit(2000)), TC.api.sel('rental_locations', 'id,name', q => q.eq('is_active', true).order('name')), TC.api.sel('rental_extras', '*', q => q.eq('is_active', true).order('name'))]);
      if (S.mode === 'sheet') await loadContract(Number(params[0]));
    },
    html: () => S.mode === 'list' ? listHtml() : S.mode === 'new' ? newHtml() : S.c ? sheetHtml() : U.shell('locations', `<p class="empty">${t('not_found')}</p>`),
    bind: () => {
      const main = U.$('#main');
      if (S.mode === 'new') {
        const cs = U.$('#rn-cust'), nc = U.$('#rn-newc'); const sync = () => { nc.hidden = !!cs.value; }; cs.addEventListener('change', sync); sync();
        U.$('#rlNew').addEventListener('submit', async e => {
          e.preventDefault(); const err = U.$('#rn-err');
          if (!val('rn-sd') || !val('rn-ed') || !val('rn-dn') || !val('rn-db') || !val('rn-ln') || !val('rn-li') || !val('rn-le')) { err.textContent = t('rl_need'); return; }
          const starts = U.romeToIso(val('rn-sd'), val('rn-st') || '09:00'), ends = U.romeToIso(val('rn-ed'), val('rn-et') || '09:00');
          if (ends <= starts) { err.textContent = t('ho_dates_bad'); U.$('#rn-ed').focus(); return; }
          if (!S.vehicles.length) { err.textContent = t('rl_no_vehicle'); return; }
          const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
          try {
            let customer = Number(val('rn-cust')) || null;
            if (!customer) { if (!val('rn-cf') || !val('rn-cl')) { err.textContent = t('rl_need_client'); btn.disabled = false; return; }
              // jamais de client en double : on réutilise la fiche créée lors d'un essai précédent, ou la fiche existante de même e-mail
              const email = val('rn-ce').toLowerCase() || null;
              const same = email ? await TC.api.sel('customers', 'id', q => q.eq('email', email).is('merged_into_id', null).limit(1)) : [];
              customer = S.newCustomer || (same[0] && same[0].id) || (await TC.api.createCustomer({ first_name: val('rn-cf'), last_name: val('rn-cl'), email, phone: val('rn-cp') || null })).id;
              S.newCustomer = customer; }
            const row = { vehicle_id: Number(val('rn-veh')), customer_id: customer, starts_at: starts, ends_at: ends, pickup_location_id: Number(val('rn-pick')) || null, return_location_id: Number(val('rn-ret')) || null,
              formula: val('rn-form'), extras: U.$$('input[name="rn-x"]:checked').map(i => ({ id: Number(i.value), qty: 1 })), driver_name: val('rn-dn'), driver_birthdate: val('rn-db'), license_number: val('rn-ln'),
              license_category: val('rn-lc'), license_issued_on: val('rn-li'), license_expires_on: val('rn-le'), second_driver_name: val('rn-d2') || null, notes: val('rn-notes') || null };
            const c = await TC.api.ins('rental_contracts', row); location.hash = '#/locations/' + c.id;
          } catch (e2) { btn.disabled = false; err.textContent = errMsg(e2); }
        });
        return;
      }
      if (S.mode !== 'sheet' || !S.c) return;
      U.$$('canvas.sigpad').forEach(bindPad);
      const ierr = (kind, e) => { const el = U.$('#ie-' + kind) || U.$('#rl-err'); el.textContent = errMsg(e); };
      const lic = U.$('#rl-lic'); if (lic) lic.addEventListener('change', async () => { try { await TC.api.upd('rental_contracts', S.c.id, { license_original_checked: lic.checked }); await again(t('saved')); } catch (e) { U.$('#rl-err').textContent = errMsg(e); } });
      const pickZone = z => { const kind = !S.ins.departure || S.ins.departure.signed_at ? 'return' : 'departure'; S.zone = { kind, z }; TC.render(true); const f = U.$(`#dt-${kind}`); if (f) f.focus(); };
      main.addEventListener('click', async e => {
        const z = e.target.closest('[data-zone]'); if (z && e.target.closest('section[data-ins]')) { pickZone(z.dataset.zone); return; }
        const b = e.target.closest('[data-rl],[data-ins-start],[data-ins-save],[data-ins-sign],[data-sig-clear]'); if (!b) { if (e.target.id === 'rlPrint') window.print(); return; }
        if (b.dataset.sigClear) { const cv = U.$(`canvas[data-sig="${b.dataset.sigClear}"]`); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.dataset.inked = ''; return; }
        try {
          if (b.dataset.rl) { if (b.dataset.rl === 'cancelled' && !confirm(t('rl_cancel_confirm'))) return; await TC.api.upd('rental_contracts', S.c.id, { status: b.dataset.rl }); return again(t('saved')); }
          if (b.dataset.insStart) { await TC.api.ins('inspections', { contract_id: S.c.id, kind: b.dataset.insStart }); return again(); }
          const kind = b.dataset.insSave || b.dataset.insSign, ins = S.ins[kind];
          const km = U.$('#ik-' + kind).value === '' ? null : Number(U.$('#ik-' + kind).value), fuel = U.$('#if-' + kind).value === '' ? null : Number(U.$('#if-' + kind).value);
          if (b.dataset.insSave) { await TC.api.upd('inspections', ins.id, U.patchOf(ins, { km, fuel_eighths: fuel }) ); return again(t('saved')); }
          const missing = SIDES.filter(sd => !(ins.inspection_photos || []).some(x => x.side === sd));
          if (missing.length) { U.$('#ie-' + kind).textContent = t('ins_missing_list', { s: missing.map(sd => t('side_' + sd)).join(', ') }); return; }
          const cv = U.$(`canvas[data-sig="${kind}"]`), name = U.$('#sn-' + kind).value.trim();
          if (!cv.dataset.inked || !name) { U.$('#ie-' + kind).textContent = t('ins_sig_need'); return; }
          const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
          const path = await upload(`contrats/${S.c.id}/${kind}-signature-${Date.now()}.png`, blob, 'image/png');
          await TC.api.upd('inspections', ins.id, { km, fuel_eighths: fuel, signature_path: path, signed_by_name: name, signed_at: new Date().toISOString() });
          await again(t('ins_signed_ok'));
        } catch (err) { ierr(b.dataset.insSave || b.dataset.insSign || 'departure', err); }
      });
      main.addEventListener('keydown', e => { const z = e.target.closest('rect[data-zone]'); if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickZone(z.dataset.zone); } });
      main.addEventListener('change', async e => {
        const f = e.target.closest('input[data-photo]'); if (!f || !f.files[0]) return;
        const [kind, side] = f.dataset.photo.split(':'), ins = S.ins[kind];
        try { const blob = await compress(f.files[0]); const path = await upload(`contrats/${S.c.id}/${kind}-${side}-${Date.now()}.jpg`, blob);
          await TC.api.ins('inspection_photos', { inspection_id: ins.id, side, path }); await again(t('saved')); }
        catch (err) { ierr(kind, err); }
      });
      U.$$('form[data-dmg-form]').forEach(fm => fm.addEventListener('submit', async e => {
        e.preventDefault(); const kind = fm.dataset.dmgForm, ins = S.ins[kind];
        if (!S.zone || S.zone.kind !== kind) { U.$('#ie-' + kind).textContent = t('ins_zone_pick'); return; }
        try { let photo = null; const pf = U.$('#dp-' + kind).files[0];
          if (pf) photo = await upload(`contrats/${S.c.id}/${kind}-${S.zone.z}-${Date.now()}.jpg`, await compress(pf));
          await TC.api.ins('inspection_damages', { inspection_id: ins.id, zone: S.zone.z, type: U.$('#dt-' + kind).value, note: U.$('#dn-' + kind).value.trim() || null, photo_path: photo });
          S.zone = null; await again(t('saved')); } catch (err) { ierr(kind, err); }
      }));
      const fee = U.$('#feeForm'); if (fee) fee.addEventListener('submit', async e => {
        e.preventDefault(); const fuel = U.cents(U.$('#fe-fuel').value || '0'), dmg = U.cents(U.$('#fe-dmg').value || '0');
        if (!Number.isFinite(fuel) || !Number.isFinite(dmg) || fuel < 0 || dmg < 0) { U.$('#rl-err').textContent = t('ho_num_bad'); return; }
        try { await TC.api.upd('rental_contracts', S.c.id, { fuel_fee_cents: fuel, damage_fee_cents: dmg }); await again(t('saved')); } catch (err) { U.$('#rl-err').textContent = errMsg(err); }
      });
    }
  };
})(window.TC);
