/* Fournisseurs : hôtels, transporteurs, loueurs, réceptifs, compagnies, lieux… (table « suppliers »).
   Doublon refusé par la base (même type + même nom). Droits : admin + conseiller. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const KINDS = ['hotel', 'transport', 'car_rental', 'receptive', 'airline', 'venue', 'guide', 'restaurant', 'other'];
  const S = { list: [], edit: null, q: '', kind: 'all' };

  const form = (x = {}) => `<form id="spForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px">
    <h2 style="font-size:16px;font-weight:800">${x.id ? t('sp_edit_t') : t('sp_new_t')}</h2>
    <div class="row"><div class="field"><label for="sp-kind">${t('sp_kind')}</label><select id="sp-kind">${KINDS.map(k => `<option value="${k}" ${x.kind === k ? 'selected' : ''}>${t('spk_' + k)}</option>`).join('')}</select></div>
      <div class="field"><label for="sp-name">${t('sp_name')}</label><input id="sp-name" maxlength="200" required value="${U.esc(x.name || '')}" aria-describedby="sp-err"></div></div>
    <div class="row"><div class="field"><label for="sp-contact">${t('sp_contact')}</label><input id="sp-contact" maxlength="200" value="${U.esc(x.contact_name || '')}"></div>
      <div class="field"><label for="sp-email">${t('email')}</label><input id="sp-email" type="email" maxlength="200" value="${U.esc(x.email || '')}"></div>
      <div class="field"><label for="sp-phone">${t('n_phone')}</label><input id="sp-phone" type="tel" maxlength="50" value="${U.esc(x.phone || '')}"></div></div>
    <div class="row"><div class="field"><label for="sp-address">${t('sp_address')}</label><input id="sp-address" maxlength="300" value="${U.esc(x.address || '')}"></div>
      <div class="field"><label for="sp-city">${t('sp_city')}</label><input id="sp-city" maxlength="100" value="${U.esc(x.city || '')}"></div>
      <div class="field"><label for="sp-country">${t('sp_country')}</label><input id="sp-country" maxlength="2" value="${U.esc(x.country || '')}" placeholder="IT" style="text-transform:uppercase"></div></div>
    <div class="field"><label for="sp-cancel">${t('sp_cancel_pol')}</label><textarea id="sp-cancel" maxlength="2000">${U.esc(x.cancellation_policy || '')}</textarea></div>
    <div class="field"><label for="sp-notes">${t('cl_notes')}</label><textarea id="sp-notes" maxlength="4000">${U.esc(x.notes || '')}</textarea></div>
    ${x.id ? `<label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="checkbox" id="sp-active" ${x.is_active ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('sp_active')}</label>` : ''}
    <span class="err" id="sp-err" role="alert"></span>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">${t('cl_save')}</button>${x.id ? `<button class="btn quiet" type="button" id="spCancel">${t('cl_cancel')}</button>` : ''}</div>
  </form>`;

  function listHtml() {
    const q = S.q.trim().toLowerCase();
    const rows = S.list.filter(x => (S.kind === 'all' || x.kind === S.kind) && (!q || [x.name, x.contact_name, x.city, x.email].filter(Boolean).join(' ').toLowerCase().includes(q)));
    if (!S.list.length) return `<p class="empty">${t('sp_none')}</p>`;
    if (!rows.length) return `<p class="empty">${t('cl_nomatch')}</p>`;
    return `<div class="tscroll"><table class="t"><caption class="sr">${t('sp_t')}</caption><thead><tr><th scope="col">${t('sp_name')}</th><th scope="col">${t('sp_kind')}</th><th scope="col">${t('sp_contact')}</th><th scope="col">${t('n_phone')}</th><th scope="col">${t('sp_city')}</th><th scope="col"><span class="sr">${t('sp_edit_t')}</span></th></tr></thead>
      <tbody>${rows.map(x => `<tr${x.is_active ? '' : ' style="opacity:.6"'}><th scope="row">${U.esc(x.name)}${x.is_active ? '' : ` <span class="badge src">${t('sp_inactive')}</span>`}</th><td>${t('spk_' + x.kind)}</td>
        <td>${U.esc(x.contact_name || '—')}${x.email ? `<br><a href="mailto:${U.esc(x.email)}">${U.esc(x.email)}</a>` : ''}</td><td>${U.esc(x.phone_e164 || x.phone || '—')}</td><td>${U.esc(x.city || '—')}</td>
        <td><button type="button" class="btn ghost small" data-edit="${x.id}">${t('sp_edit_b')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  TC.views.fournisseurs = {
    load: async () => { S.list = await TC.api.sel('suppliers', '*', q => q.order('name')); S.edit = null; },
    html: () => U.shell('fournisseurs', `
      <div class="page-head"><div><h1>${t('sp_t')}</h1><p class="sub">${t('sp_d')}</p></div></div>
      <div class="grid2"><div class="stack">
        <div class="toolbar"><div class="field" style="flex:1 1 200px;max-width:300px"><label for="spq">${t('search')}</label><input id="spq" type="search" value="${U.esc(S.q)}"></div>
          <div class="field" style="max-width:220px"><label for="spk">${t('sp_kind')}</label><select id="spk"><option value="all">${t('ty_all')}</option>${KINDS.map(k => `<option value="${k}" ${S.kind === k ? 'selected' : ''}>${t('spk_' + k)}</option>`).join('')}</select></div></div>
        <div id="spList">${listHtml()}</div></div>
        <div id="spFormZone">${form(S.edit || {})}</div></div>`),
    bind: () => {
      const main = U.$('#main');
      U.$('#spq').addEventListener('input', e => { S.q = e.target.value; U.$('#spList').innerHTML = listHtml(); });
      U.$('#spk').addEventListener('change', e => { S.kind = e.target.value; U.$('#spList').innerHTML = listHtml(); });
      main.addEventListener('click', e => {
        const b = e.target.closest('[data-edit]'); if (b) { S.edit = S.list.find(x => x.id === Number(b.dataset.edit)); TC.render(true); U.$('#sp-name').focus(); }
        if (e.target.id === 'spCancel') { S.edit = null; TC.render(true); }
      });
      U.$('#spForm').addEventListener('submit', async e => {
        e.preventDefault();
        const err = U.$('#sp-err'), before = S.edit || {};
        const next = { kind: U.$('#sp-kind').value, name: U.$('#sp-name').value.trim(), contact_name: U.$('#sp-contact').value.trim(), email: U.$('#sp-email').value.trim().toLowerCase(),
          phone: U.$('#sp-phone').value.trim(), address: U.$('#sp-address').value.trim(), city: U.$('#sp-city').value.trim(), country: U.$('#sp-country').value.trim().toUpperCase(),
          cancellation_policy: U.$('#sp-cancel').value.trim(), notes: U.$('#sp-notes').value.trim() };
        if (before.id) next.is_active = U.$('#sp-active').checked;
        if (!next.name) { err.textContent = t('sp_need_name'); U.$('#sp-name').focus(); return; }
        if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) { err.textContent = t('e_email'); U.$('#sp-email').focus(); return; }
        if (next.country && !/^[A-Z]{2}$/.test(next.country)) { err.textContent = t('sp_bad_country'); U.$('#sp-country').focus(); return; }
        const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        try {
          if (before.id) { const p = U.patchOf(before, next); if (Object.keys(p).length) await TC.api.upd('suppliers', before.id, p); }
          else await TC.api.ins('suppliers', Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')));
          U.toast(t('saved')); await TC.views.fournisseurs.load(); TC.render(true);
        } catch (e2) { btn.disabled = false; err.textContent = /unique|duplicate/i.test(U.errMsg(e2)) ? t('sp_dup') : t('save_err', { msg: U.errMsg(e2) }); }
      });
    }
  };
})(window.TC);
