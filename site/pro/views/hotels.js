/* Hôtels : fiches, chambres, saisons (TVA saisie par l'agence), tranches d'âge enfants, grille tarifaire chambres × pensions,
   allotements et simulateur de prix. Le calcul est fait par la base (staff_price_stay) : même résultat que la recherche publique.
   Montants saisis en euros, stockés en centimes ; pourcentages stockés en points de base. Aucune valeur inventée. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const BOARDS = ['RO', 'BB', 'HB', 'FB', 'AI'];
  const KINDS = ['hotel', 'bnb', 'apartment', 'resort', 'guesthouse'];
  const S = { list: [], dests: [], sups: [], h: null, rooms: [], seasons: [], bands: [], rates: [], allot: [], season: null, sim: null };
  const destName = id => { const d = S.dests.find(x => x.id === id); return d ? d.name : ''; };
  const opt = (v, cur, label) => `<option value="${U.esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${U.esc(label)}</option>`;
  const num = id => { const v = U.$('#' + id).value.trim(); return v === '' ? null : Number(v); };
  const err = (id, msg, focus) => { U.$('#' + id).textContent = msg; if (focus) U.$('#' + focus).focus(); return false; };

  // ---------- Liste ----------
  function listHtml() {
    return U.shell('hotels', `
      <div class="page-head"><div><h1>${t('ho_t')}</h1><p class="sub">${t('ho_d')}</p></div></div>
      <div class="grid2"><div>${S.list.length ? `<div class="tscroll"><table class="t"><caption class="sr">${t('ho_t')}</caption>
        <thead><tr><th scope="col">${t('ho_name')}</th><th scope="col">${t('ho_dest')}</th><th scope="col">${t('ho_stars')}</th><th scope="col">${t('ho_rooms')}</th><th scope="col">${t('ho_pub')}</th></tr></thead>
        <tbody>${S.list.map(h => `<tr><th scope="row"><a href="#/hotels/${h.id}">${U.esc(h.name)}</a></th><td>${U.esc(destName(h.destination_id))}</td><td>${h.stars ? '★'.repeat(h.stars) : '—'}</td>
          <td>${(h.hotel_rooms && h.hotel_rooms[0] && h.hotel_rooms[0].count) || 0}</td><td>${h.is_published ? `<span class="badge st-won">${t('ho_pub_yes')}</span>` : `<span class="badge src">${t('ho_pub_no')}</span>`}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${t('ho_none')}</p>`}</div>
      <form id="hoNew" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:16px;font-weight:800">${t('ho_new_t')}</h2>
        <div class="field"><label for="hn-name">${t('ho_name')}</label><input id="hn-name" maxlength="200" required aria-describedby="hn-err"></div>
        <div class="field"><label for="hn-dest">${t('ho_dest')}</label><select id="hn-dest">${S.dests.map(d => opt(d.id, 1, d.name)).join('')}</select></div>
        <div class="field"><label for="hn-sup">${t('ho_supplier')}</label><select id="hn-sup"><option value="">—</option>${S.sups.map(s => opt(s.id, '', s.name)).join('')}</select></div>
        <span class="err" id="hn-err" role="alert"></span><div><button class="btn" type="submit">${t('ho_create')}</button></div></form></div>`);
  }

  // ---------- Fiche ----------
  const sec = (id, title, body) => `<section class="card pad" aria-labelledby="${id}" style="display:flex;flex-direction:column;gap:12px"><h2 id="${id}" style="font-size:16px;font-weight:800">${title}</h2>${body}</section>`;

  function infoSec(h) {
    const d = h.description_i18n || {};
    return sec('hi-h', t('ho_info'), `<form id="hoInfo" novalidate style="display:flex;flex-direction:column;gap:12px">
      <div class="row"><div class="field"><label for="hi-name">${t('ho_name')}</label><input id="hi-name" maxlength="200" required value="${U.esc(h.name)}"></div>
        <div class="field"><label for="hi-kind">${t('ho_kind')}</label><select id="hi-kind">${KINDS.map(k => opt(k, h.kind, t('hok_' + k))).join('')}</select></div>
        <div class="field"><label for="hi-stars">${t('ho_stars')}</label><select id="hi-stars"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => opt(n, h.stars, '★'.repeat(n))).join('')}</select></div></div>
      <div class="row"><div class="field"><label for="hi-dest">${t('ho_dest')}</label><select id="hi-dest">${S.dests.map(x => opt(x.id, h.destination_id, x.name)).join('')}</select></div>
        <div class="field"><label for="hi-sup">${t('ho_supplier')}</label><select id="hi-sup"><option value="">—</option>${S.sups.map(s => opt(s.id, h.supplier_id, s.name)).join('')}</select></div></div>
      <div class="field"><label for="hi-addr">${t('sp_address')}</label><input id="hi-addr" maxlength="300" value="${U.esc(h.address || '')}"></div>
      <div class="row"><div class="field"><label for="hi-cin">${t('ho_cin')}</label><input id="hi-cin" type="time" value="${U.esc(h.check_in || '')}"></div>
        <div class="field"><label for="hi-cout">${t('ho_cout')}</label><input id="hi-cout" type="time" value="${U.esc(h.check_out || '')}"></div>
        <div class="field"><label for="hi-baby">${t('ho_baby_age')}</label><input id="hi-baby" type="number" min="0" max="5" value="${h.baby_max_age}"></div>
        <div class="field"><label for="hi-child">${t('ho_child_age')}</label><input id="hi-child" type="number" min="1" max="17" value="${h.child_max_age}"></div></div>
      <fieldset style="border:none;margin:0;padding:0"><legend style="font-weight:700;margin-bottom:6px">${t('ho_boards')}</legend><div style="display:flex;flex-wrap:wrap;gap:8px">
        ${BOARDS.map(b => `<label class="ipick" style="min-width:120px"><input type="checkbox" name="hi-board" value="${b}" ${h.boards.includes(b) ? 'checked' : ''}><span><strong>${b}</strong> · ${t('board_' + b)}</span></label>`).join('')}</div></fieldset>
      <div><p style="font-weight:700;margin:0 0 6px">${t('ho_amen')}</p>${TC.icons.picker('hi-amen', 'hotel', h.amenities)}</div>
      ${['fr', 'it', 'en'].map(l => `<div class="field"><label for="hi-desc-${l}">${t('ho_desc')} (${l.toUpperCase()})</label><textarea id="hi-desc-${l}" maxlength="3000">${U.esc(d[l] || '')}</textarea></div>`).join('')}
      <div class="field"><label for="hi-photos">${t('ho_photos')}</label><textarea id="hi-photos" aria-describedby="hi-photos-h">${U.esc((h.photo_urls || []).join('\n'))}</textarea><span class="sub" id="hi-photos-h" style="font-size:12.5px">${t('ho_photos_h')}</span></div>
      <label style="display:flex;gap:8px;align-items:center;min-height:44px;font-weight:700"><input type="checkbox" id="hi-pub" ${h.is_published ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('ho_publish')}</label>
      <span class="err" id="hi-err" role="alert"></span><div><button class="btn" type="submit">${t('cl_save')}</button></div></form>`);
  }

  function roomsSec() {
    return sec('hr-h', t('ho_rooms_t'), `${S.rooms.length ? `<ul class="plain">${S.rooms.map(r => `<li class="duprow"><span><strong>${U.esc(r.name)}</strong> · ${t('ho_room_cap', { a1: r.adults_min, a2: r.adults_max, c: r.children_max, o: r.occupancy_max })}${r.baby_cot ? ' · ' + t('ho_cot') : ''}<br>${TC.icons.chips(r.amenities)}</span>
        <button type="button" class="btn quiet small" data-delroom="${r.id}">${t('ho_del')}<span class="sr"> ${U.esc(r.name)}</span></button></li>`).join('')}</ul>` : `<p class="sub">${t('ho_no_rooms')}</p>`}
      <form id="hoRoom" novalidate style="display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px"><h3 style="font-size:15px">${t('ho_room_add')}</h3>
        <div class="row"><div class="field"><label for="rr-name">${t('ho_room_name')}</label><input id="rr-name" maxlength="120" required></div>
          <div class="field"><label for="rr-a1">${t('ho_ad_min')}</label><input id="rr-a1" type="number" min="1" max="10" value="1"></div>
          <div class="field"><label for="rr-a2">${t('ho_ad_max')}</label><input id="rr-a2" type="number" min="1" max="10" value="2"></div>
          <div class="field"><label for="rr-c">${t('ho_ch_max')}</label><input id="rr-c" type="number" min="0" max="10" value="0"></div>
          <div class="field"><label for="rr-o">${t('ho_occ_max')}</label><input id="rr-o" type="number" min="1" max="12" value="2"></div></div>
        <label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="checkbox" id="rr-cot" style="width:20px;height:20px;accent-color:var(--accent)"> ${t('ho_cot')}</label>
        <details><summary style="cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center">${t('ho_room_amen')}</summary>${TC.icons.picker('rr-amen', 'hotel', [])}</details>
        <span class="err" id="rr-err" role="alert"></span><div><button class="btn ghost" type="submit">${t('ho_room_add')}</button></div></form>`);
  }

  function seasonsSec() {
    return sec('hs-h', t('ho_seasons_t'), `${S.seasons.length ? `<ul class="plain">${S.seasons.map(s => `<li class="duprow" style="align-items:flex-start"><span><strong>${U.esc(s.name)}</strong> · ${U.date(s.date_from)} → ${U.date(s.date_to)}${s.stop_sale ? ` <span class="badge st-lost">${t('ho_stop')}</span>` : ''}<br>
          <span class="sub">${t('ho_vat')} ${U.pct(s.vat_rate_bp)} · ${t('ho_min_n')} ${s.min_nights} · ${t('ho_release')} ${s.release_days} j · ${t('ho_single')} ${U.eur(s.single_supplement_cents)} · ${t('ho_third')} −${U.pct(s.third_adult_discount_bp)}</span><br>
          <span class="sub">${t('ho_bands')} : ${S.bands.filter(b => b.season_id === s.id).sort((a, b) => a.age_from - b.age_from).map(b => `${b.age_from}–${b.age_to} ${t('ho_years')} −${U.pct(b.discount_bp)} <button type="button" class="linkbtn" data-delband="${b.id}" aria-label="${t('ho_del')} ${b.age_from}–${b.age_to}">✕</button>`).join(' · ') || t('ho_no_bands')}</span></span>
        <span style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn ghost small" data-stop="${s.id}">${s.stop_sale ? t('ho_reopen') : t('ho_stop_b')}</button><button type="button" class="btn quiet small" data-delseason="${s.id}">${t('ho_del')}<span class="sr"> ${U.esc(s.name)}</span></button></span></li>`).join('')}</ul>` : `<p class="sub">${t('ho_no_seasons')}</p>`}
      <form id="hoSeason" novalidate style="display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px"><h3 style="font-size:15px">${t('ho_season_add')}</h3>
        <div class="row"><div class="field"><label for="ss-name">${t('ho_season_name')}</label><input id="ss-name" maxlength="120" required></div>
          <div class="field"><label for="ss-from">${t('ho_from')}</label><input id="ss-from" type="date" required></div>
          <div class="field"><label for="ss-to">${t('ho_to')}</label><input id="ss-to" type="date" required></div></div>
        <div class="row"><div class="field"><label for="ss-vat">${t('ho_vat')} (%)</label><input id="ss-vat" inputmode="decimal" required aria-describedby="ss-vat-h"><span class="sub" id="ss-vat-h" style="font-size:12.5px">${t('ho_vat_h')}</span></div>
          <div class="field"><label for="ss-min">${t('ho_min_n')}</label><input id="ss-min" type="number" min="1" value="1"></div>
          <div class="field"><label for="ss-rel">${t('ho_release')}</label><input id="ss-rel" type="number" min="0" value="0"></div></div>
        <div class="row"><div class="field"><label for="ss-single">${t('ho_single')} (€ / ${t('ho_night')})</label><input id="ss-single" inputmode="decimal" value="0"></div>
          <div class="field"><label for="ss-third">${t('ho_third')} (%)</label><input id="ss-third" inputmode="decimal" value="0"></div></div>
        <span class="err" id="ss-err" role="alert"></span><div><button class="btn ghost" type="submit">${t('ho_season_add')}</button></div></form>
      ${S.seasons.length ? `<form id="hoBand" novalidate style="display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px"><h3 style="font-size:15px">${t('ho_band_add')}</h3>
        <div class="row"><div class="field"><label for="bb-season">${t('ho_season_name')}</label><select id="bb-season">${S.seasons.map(s => opt(s.id, '', s.name)).join('')}</select></div>
          <div class="field"><label for="bb-from">${t('ho_age_from')}</label><input id="bb-from" type="number" min="0" max="17" required></div>
          <div class="field"><label for="bb-to">${t('ho_age_to')}</label><input id="bb-to" type="number" min="0" max="17" required></div>
          <div class="field"><label for="bb-disc">${t('ho_band_disc')} (%)</label><input id="bb-disc" inputmode="decimal" required></div></div>
        <span class="err" id="bb-err" role="alert"></span><div><button class="btn ghost" type="submit">${t('ho_band_add')}</button></div></form>` : ''}`);
  }

  function gridSec(h) {
    if (!S.seasons.length || !S.rooms.length || !h.boards.length) return sec('hg-h', t('ho_grid_t'), `<p class="sub">${t('ho_grid_need')}</p>`);
    const sid = S.season || S.seasons[0].id;
    const rate = (r, b) => S.rates.find(x => x.season_id === sid && x.room_id === r && x.board === b);
    const client = x => x ? (x.price_cents != null ? x.price_cents : Math.round(x.cost_cents * (10000 + x.margin_bp) / 10000)) : null;
    return sec('hg-h', t('ho_grid_t'), `<p class="sub" style="margin:0">${t('ho_grid_d')}</p>
      <div class="field" style="max-width:320px"><label for="hg-season">${t('ho_season_name')}</label><select id="hg-season">${S.seasons.map(s => opt(s.id, sid, s.name)).join('')}</select></div>
      <div class="tscroll"><table class="t"><caption class="sr">${t('ho_grid_t')}</caption><thead><tr><th scope="col">${t('ho_room_name')}</th><th scope="col">${t('ho_board')}</th><th scope="col">${t('ho_cost')}</th><th scope="col">${t('ho_margin')}</th><th scope="col">${t('ho_imposed')}</th><th scope="col">${t('ho_client')}</th><th scope="col"><span class="sr">${t('cl_save')}</span></th></tr></thead>
      <tbody>${S.rooms.map(r => h.boards.map(b => { const x = rate(r.id, b), k = `${r.id}-${b}`; return `<tr>
        <th scope="row">${U.esc(r.name)}</th><td>${b}</td>
        <td><label class="sr" for="rc-${k}">${t('ho_cost')} ${U.esc(r.name)} ${b}</label><input id="rc-${k}" inputmode="decimal" style="max-width:110px" value="${x ? U.euroIn(x.cost_cents) : ''}"></td>
        <td><label class="sr" for="rm-${k}">${t('ho_margin')} ${U.esc(r.name)} ${b}</label><input id="rm-${k}" inputmode="decimal" style="max-width:90px" value="${x && x.margin_bp != null ? x.margin_bp / 100 : ''}"></td>
        <td><label class="sr" for="rp-${k}">${t('ho_imposed')} ${U.esc(r.name)} ${b}</label><input id="rp-${k}" inputmode="decimal" style="max-width:110px" value="${x && x.price_cents != null ? U.euroIn(x.price_cents) : ''}"></td>
        <td>${x ? U.eur(client(x)) + ' ' + t('ho_ht') : '—'}</td>
        <td><button type="button" class="btn ghost small" data-rate="${r.id}:${b}">${t('cl_save')}<span class="sr"> ${U.esc(r.name)} ${b}</span></button></td></tr>`; }).join('')).join('')}</tbody></table></div>
      <span class="err" id="hg-err" role="alert"></span>`);
  }

  function allotSec() {
    if (!S.rooms.length) return '';
    const up = S.allot.filter(a => a.day >= U.todayRome()).slice(0, 60);
    return sec('ha-h', t('ho_allot_t'), `<p class="sub" style="margin:0">${t('ho_allot_d')}</p>
      <form id="hoAllot" novalidate style="display:flex;flex-direction:column;gap:10px"><div class="row">
        <div class="field"><label for="al-room">${t('ho_room_name')}</label><select id="al-room">${S.rooms.map(r => opt(r.id, '', r.name)).join('')}</select></div>
        <div class="field"><label for="al-from">${t('ho_from')}</label><input id="al-from" type="date" required></div>
        <div class="field"><label for="al-to">${t('ho_to')}</label><input id="al-to" type="date" required></div>
        <div class="field"><label for="al-q">${t('ho_qty')}</label><input id="al-q" type="number" min="0" max="999" required></div></div>
        <span class="err" id="al-err" role="alert"></span><div><button class="btn ghost" type="submit">${t('ho_allot_b')}</button></div></form>
      ${up.length ? `<p class="sub" style="margin:0">${up.map(a => `${U.esc((S.rooms.find(r => r.id === a.room_id) || {}).name || '')} ${U.date(a.day)} : <strong>${a.quantity}</strong>`).join(' · ')}</p>` : ''}`);
  }

  function simSec(h) {
    if (!S.rooms.length || !h.boards.length) return '';
    const r = S.sim;
    let out = '';
    if (r && r.error) out = `<p class="alert bad" role="alert">${t('ho_err_' + r.error, { min: r.min || '' })}</p>`;
    else if (r) out = `<p class="alert good" role="status"><strong>${U.eur(r.total_cents)} ${t('ho_ttc')}</strong> · ${t('ho_nights', { n: r.nights })} · ${t('ho_ht')} ${U.eur(r.ht_cents)} · ${t('ho_vat')} ${U.eur(r.vat_cents)}<br>
        ${t('ho_cost')} ${U.eur(r.cost_cents)} · ${t('ho_margin_eur')} ${U.eur(r.ht_cents - r.cost_cents)}</p>`;
    return sec('hm-h', t('ho_sim_t'), `<form id="hoSim" novalidate style="display:flex;flex-direction:column;gap:10px"><div class="row">
        <div class="field"><label for="sm-room">${t('ho_room_name')}</label><select id="sm-room">${S.rooms.map(x => opt(x.id, '', x.name)).join('')}</select></div>
        <div class="field"><label for="sm-board">${t('ho_board')}</label><select id="sm-board">${h.boards.map(b => opt(b, '', b + ' · ' + t('board_' + b))).join('')}</select></div></div>
      <div class="row"><div class="field"><label for="sm-in">${t('ho_in')}</label><input id="sm-in" type="date" required></div>
        <div class="field"><label for="sm-out">${t('ho_out')}</label><input id="sm-out" type="date" required></div>
        <div class="field"><label for="sm-ad">${t('ho_adults')}</label><input id="sm-ad" type="number" min="0" max="10" value="2"></div>
        <div class="field"><label for="sm-ages">${t('ho_ages')}</label><input id="sm-ages" placeholder="4, 8" aria-describedby="sm-ages-h"><span class="sub" id="sm-ages-h" style="font-size:12.5px">${t('ho_ages_h')}</span></div></div>
      <span class="err" id="sm-err" role="alert"></span><div><button class="btn" type="submit">${t('ho_sim_b')}</button></div></form><div aria-live="polite">${out}</div>`);
  }

  function sheetHtml() {
    const h = S.h;
    return U.shell('hotels', `<p style="margin:0 0 10px"><a href="#/hotels">${t('ho_back')}</a></p>
      <div class="page-head"><div><h1>${U.esc(h.name)} ${h.stars ? '★'.repeat(h.stars) : ''}</h1><p class="sub">${U.esc(destName(h.destination_id))} · ${h.is_published ? t('ho_pub_yes') : t('ho_pub_no')}</p></div></div>
      <div class="stack">${infoSec(h)}${roomsSec()}${seasonsSec()}${gridSec(h)}${allotSec()}${simSec(h)}</div>`);
  }

  async function reloadSheet(id) {
    const [h, rooms, seasons] = await Promise.all([TC.api.sel('hotels', '*', q => q.eq('id', id).maybeSingle()), TC.api.sel('hotel_rooms', '*', q => q.eq('hotel_id', id).order('id')), TC.api.sel('hotel_seasons', '*', q => q.eq('hotel_id', id).order('date_from'))]);
    S.h = h; S.rooms = rooms; S.seasons = seasons;
    const sids = seasons.map(s => s.id), rids = rooms.map(r => r.id);
    [S.bands, S.rates, S.allot] = await Promise.all([
      sids.length ? TC.api.sel('hotel_child_bands', '*', q => q.in('season_id', sids)) : [],
      sids.length ? TC.api.sel('hotel_rates', '*', q => q.in('season_id', sids)) : [],
      rids.length ? TC.api.sel('hotel_allotments', '*', q => q.in('room_id', rids).order('day')) : []]);
    if (S.season && !sids.includes(S.season)) S.season = null;
  }
  const again = async (msg) => { if (msg) U.toast(msg); await reloadSheet(S.h.id); TC.render(true); };
  const guard = async (fn, errId) => { try { await fn(); } catch (e) { const m = U.errMsg(e); U.$('#' + errId) ? (U.$('#' + errId).textContent = /chevauche|23P01/.test(m) ? t('ho_overlap') : t('save_err', { msg: m })) : U.toast(t('save_err', { msg: m })); } };

  TC.views.hotels = {
    load: async params => {
      [S.dests, S.sups] = await Promise.all([TC.api.sel('destinations', 'id,slug,name', q => q.order('id')), TC.api.sel('suppliers', 'id,name,kind', q => q.eq('is_active', true).order('name'))]);
      if (params && params[0]) { S.sim = null; await reloadSheet(Number(params[0])); }
      else { S.h = null; S.list = await TC.api.sel('hotels', 'id,name,destination_id,stars,is_published,hotel_rooms(count)', q => q.order('name')); }
    },
    html: () => S.h ? sheetHtml() : (location.hash.split('/')[2] ? U.shell('hotels', `<p class="empty">${t('not_found')} <a href="#/hotels">${t('ho_back')}</a></p>`) : listHtml()),
    bind: () => {
      if (!S.h) {
        const f = U.$('#hoNew'); if (!f) return;
        f.addEventListener('submit', e => { e.preventDefault(); const name = U.$('#hn-name').value.trim(); if (!name) return err('hn-err', t('sp_need_name'), 'hn-name');
          guard(async () => { const h = await TC.api.ins('hotels', { name, destination_id: Number(U.$('#hn-dest').value), supplier_id: U.$('#hn-sup').value ? Number(U.$('#hn-sup').value) : null }); location.hash = '#/hotels/' + h.id; }, 'hn-err'); });
        return;
      }
      const h = S.h, main = U.$('#main');
      U.$('#hoInfo').addEventListener('submit', e => {
        e.preventDefault();
        const photos = U.$('#hi-photos').value.split('\n').map(x => x.trim()).filter(Boolean);
        if (photos.some(p => !/^https:\/\/[^\s"'<>]+$/.test(p))) return err('hi-err', t('ho_photos_bad'), 'hi-photos');
        const baby = num('hi-baby'), child = num('hi-child');
        if (!(child > baby)) return err('hi-err', t('ho_ages_bad'), 'hi-child');
        const next = { name: U.$('#hi-name').value.trim(), kind: U.$('#hi-kind').value, stars: num('hi-stars'), destination_id: Number(U.$('#hi-dest').value),
          supplier_id: U.$('#hi-sup').value ? Number(U.$('#hi-sup').value) : null, address: U.$('#hi-addr').value.trim(), check_in: U.$('#hi-cin').value, check_out: U.$('#hi-cout').value,
          baby_max_age: baby, child_max_age: child, boards: BOARDS.filter(b => U.$(`input[name="hi-board"][value="${b}"]`).checked), amenities: TC.icons.picked(U.$('#hoInfo'), 'hi-amen'),
          description_i18n: Object.fromEntries(['fr', 'it', 'en'].map(l => [l, U.$('#hi-desc-' + l).value.trim()]).filter(([, v]) => v)), photo_urls: photos, is_published: U.$('#hi-pub').checked };
        if (!next.name) return err('hi-err', t('sp_need_name'), 'hi-name');
        const p = U.patchOf(h, next); if (!Object.keys(p).length) { U.toast(t('cl_nochange')); return; }
        guard(async () => { await TC.api.upd('hotels', h.id, p); await again(t('saved')); }, 'hi-err');
      });
      U.$('#hoRoom').addEventListener('submit', e => {
        e.preventDefault();
        const row = { hotel_id: h.id, name: U.$('#rr-name').value.trim(), adults_min: num('rr-a1'), adults_max: num('rr-a2'), children_max: num('rr-c'), occupancy_max: num('rr-o'), baby_cot: U.$('#rr-cot').checked, amenities: TC.icons.picked(U.$('#hoRoom'), 'rr-amen') };
        if (!row.name) return err('rr-err', t('sp_need_name'), 'rr-name');
        if (!(row.adults_max >= row.adults_min && row.occupancy_max >= row.adults_max)) return err('rr-err', t('ho_cap_bad'), 'rr-o');
        guard(async () => { await TC.api.ins('hotel_rooms', row); await again(t('saved')); }, 'rr-err');
      });
      U.$('#hoSeason').addEventListener('submit', e => {
        e.preventDefault();
        const vat = U.bp(U.$('#ss-vat').value), third = U.bp(U.$('#ss-third').value), single = U.cents(U.$('#ss-single').value);
        const row = { hotel_id: h.id, name: U.$('#ss-name').value.trim(), date_from: U.$('#ss-from').value, date_to: U.$('#ss-to').value, vat_rate_bp: vat, min_nights: num('ss-min'), release_days: num('ss-rel'), single_supplement_cents: single, third_adult_discount_bp: third };
        if (!row.name || !row.date_from || !row.date_to) return err('ss-err', t('ho_season_need'), 'ss-name');
        if (row.date_to < row.date_from) return err('ss-err', t('ho_dates_bad'), 'ss-to');
        if (!Number.isFinite(vat) || vat > 10000) return err('ss-err', t('ho_vat_need'), 'ss-vat');
        if (!Number.isFinite(third) || !Number.isFinite(single) || single < 0) return err('ss-err', t('ho_num_bad'), 'ss-single');
        guard(async () => { await TC.api.ins('hotel_seasons', row); await again(t('saved')); }, 'ss-err');
      });
      const band = U.$('#hoBand');
      if (band) band.addEventListener('submit', e => {
        e.preventDefault();
        const row = { season_id: Number(U.$('#bb-season').value), age_from: num('bb-from'), age_to: num('bb-to'), discount_bp: U.bp(U.$('#bb-disc').value) };
        if (row.age_from == null || row.age_to == null || row.age_to < row.age_from) return err('bb-err', t('ho_ages_bad'), 'bb-to');
        if (!Number.isFinite(row.discount_bp) || row.discount_bp > 10000) return err('bb-err', t('ho_num_bad'), 'bb-disc');
        guard(async () => { await TC.api.ins('hotel_child_bands', row); await again(t('saved')); }, 'bb-err');
      });
      const gs = U.$('#hg-season'); if (gs) gs.addEventListener('change', e => { S.season = Number(e.target.value); TC.render(true); });
      const al = U.$('#hoAllot');
      if (al) al.addEventListener('submit', e => {
        e.preventDefault();
        const from = U.$('#al-from').value, to = U.$('#al-to').value, qty = num('al-q'), room = Number(U.$('#al-room').value);
        if (!from || !to || to < from || qty == null || qty < 0) return err('al-err', t('ho_dates_bad'), 'al-from');
        const rows = []; for (let d = from; d <= to && rows.length < 366; d = U.addDays(d, 1)) rows.push({ room_id: room, day: d, quantity: qty });
        guard(async () => { await TC.api.upsert('hotel_allotments', rows, 'room_id,day'); await again(t('ho_allot_ok', { n: rows.length })); }, 'al-err');
      });
      const sim = U.$('#hoSim');
      if (sim) sim.addEventListener('submit', e => {
        e.preventDefault();
        const ages = U.$('#sm-ages').value.split(/[,;\s]+/).filter(Boolean).map(Number);
        if (ages.some(a => !Number.isInteger(a) || a < 0 || a > 17)) return err('sm-err', t('ho_ages_h'), 'sm-ages');
        if (!U.$('#sm-in').value || !U.$('#sm-out').value) return err('sm-err', t('ho_dates_bad'), 'sm-in');
        guard(async () => {
          S.sim = await TC.api.rpc('staff_price_stay', { p_room: Number(U.$('#sm-room').value), p_board: U.$('#sm-board').value, p_in: U.$('#sm-in').value, p_out: U.$('#sm-out').value, p_adults: num('sm-ad') || 0, p_child_ages: ages });
          const keep = ['sm-room', 'sm-board', 'sm-in', 'sm-out', 'sm-ad', 'sm-ages'].map(id => [id, U.$('#' + id).value]);
          TC.render(true); keep.forEach(([id, v]) => { U.$('#' + id).value = v; });
        }, 'sm-err');
      });
      main.addEventListener('click', e => {
        const b = e.target.closest('[data-delroom],[data-delseason],[data-delband],[data-stop],[data-rate]'); if (!b) return;
        if (b.dataset.delroom && confirm(t('ho_del_confirm'))) guard(async () => { await TC.api.del('hotel_rooms', Number(b.dataset.delroom)); await again(t('saved')); });
        if (b.dataset.delseason && confirm(t('ho_del_confirm'))) guard(async () => { await TC.api.del('hotel_seasons', Number(b.dataset.delseason)); await again(t('saved')); });
        if (b.dataset.delband) guard(async () => { await TC.api.del('hotel_child_bands', Number(b.dataset.delband)); await again(t('saved')); });
        if (b.dataset.stop) { const s = S.seasons.find(x => x.id === Number(b.dataset.stop)); guard(async () => { await TC.api.upd('hotel_seasons', s.id, { stop_sale: !s.stop_sale }); await again(t('saved')); }); }
        if (b.dataset.rate) {
          const [room, board] = b.dataset.rate.split(':'), k = `${room}-${board}`, sid = S.season || S.seasons[0].id;
          const cost = U.cents(U.$('#rc-' + k).value), mv = U.$('#rm-' + k).value.trim(), pv = U.$('#rp-' + k).value.trim();
          const margin = mv === '' ? null : U.bp(mv), price = pv === '' ? null : U.cents(pv);
          if (!Number.isFinite(cost) || cost < 0) { err('hg-err', t('ho_cost_need'), 'rc-' + k); return; }
          if (margin == null && price == null) { err('hg-err', t('ho_margin_need'), 'rm-' + k); return; }
          if ((margin != null && !Number.isFinite(margin)) || (price != null && (!Number.isFinite(price) || price < 0))) { err('hg-err', t('ho_num_bad'), 'rm-' + k); return; }
          guard(async () => { await TC.api.upsert('hotel_rates', [{ season_id: sid, room_id: Number(room), board, cost_cents: cost, margin_bp: margin, price_cents: price }], 'season_id,room_id,board'); await again(t('saved')); }, 'hg-err');
        }
      });
    }
  };
})(window.TC);
