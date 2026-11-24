/* Clients : liste, recherche, doublons probables + fusion, fiche client (coordonnées, notes, toutes ses demandes).
   S'appuie sur la table existante « customers » (aucune table en double). Les droits sont dans la base (admin + conseiller). */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const S = { list: [], dups: [], one: null, merges: [], q: '' };
  const full = c => c.kind === 'organization' && c.company_name ? c.company_name : [c.first_name, c.last_name].filter(Boolean).join(' ');
  const nReq = c => (c.requests && c.requests[0] && c.requests[0].count) || 0;

  function listHtml() {
    const q = S.q.trim().toLowerCase();
    const rows = S.list.filter(c => !q || [full(c), c.email, c.phone, c.phone_e164, c.company_name].filter(Boolean).join(' ').toLowerCase().includes(q));
    if (!S.list.length) return `<p class="empty">${t('cl_none')}</p>`;
    if (!rows.length) return `<p class="empty">${t('cl_nomatch')}</p>`;
    return `<div class="tscroll"><table class="t"><caption class="sr">${t('cl_t')}</caption>
      <thead><tr><th scope="col">${t('cl_name')}</th><th scope="col">${t('email')}</th><th scope="col">${t('n_phone')}</th><th scope="col">${t('cl_reqs')}</th><th scope="col">${t('created')}</th></tr></thead>
      <tbody>${rows.map(c => `<tr><th scope="row"><a href="#/clients/${c.id}">${U.esc(full(c))}</a>${c.kind === 'organization' ? ` <span class="badge src">${t('cl_org')}</span>` : ''}</th>
        <td>${U.esc(c.email || '—')}</td><td>${U.esc(c.phone_e164 || c.phone || '—')}</td><td>${nReq(c)}</td><td>${U.date(c.created_at)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function dupsHtml() {
    if (!S.dups.length) return '';
    const byId = Object.fromEntries(S.list.map(c => [c.id, c]));
    const rows = S.dups.filter(d => byId[d.a] && byId[d.b]);
    if (!rows.length) return '';
    return `<section class="card pad" aria-labelledby="dup-h" style="margin-bottom:16px;display:flex;flex-direction:column;gap:10px">
      <h2 id="dup-h" style="font-size:16px;font-weight:800">${t('cl_dups_t', { n: rows.length })}</h2><p class="sub" style="margin:0">${t('cl_dups_d')}</p>
      ${rows.map(d => { const a = byId[d.a], b = byId[d.b]; return `<div class="duprow">
        <span><a href="#/clients/${a.id}">${U.esc(full(a))}</a> · <a href="#/clients/${b.id}">${U.esc(full(b))}</a> <span class="badge src">${t('cl_why_' + d.reason)}</span></span>
        <button type="button" class="btn ghost small" data-merge="${a.id}:${b.id}">${t('cl_merge_b', { name: full(a) })}</button></div>`; }).join('')}
    </section>`;
  }

  function sheetHtml() {
    const c = S.one;
    const reqs = (c.requests || []).sort((x, y) => (y.created_at > x.created_at ? 1 : -1));
    return U.shell('clients', `
      <p style="margin:0 0 10px"><a href="#/clients">${t('cl_back')}</a></p>
      <div class="page-head"><div><h1>${U.esc(full(c))}</h1><p class="sub">${t('created')} ${U.date(c.created_at)}${c.phone_e164 ? ' · ' + U.esc(c.phone_e164) : ''}</p></div></div>
      <div class="grid2">
        <form id="clForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px">
          <h2 style="font-size:16px;font-weight:800">${t('cl_info')}</h2>
          <div class="field"><label for="c-kind">${t('cl_kind')}</label><select id="c-kind"><option value="person" ${c.kind === 'person' ? 'selected' : ''}>${t('cl_person')}</option><option value="organization" ${c.kind === 'organization' ? 'selected' : ''}>${t('cl_org')}</option></select></div>
          <div class="field" id="c-company-f" ${c.kind === 'organization' ? '' : 'hidden'}><label for="c-company">${t('cl_company')}</label><input id="c-company" maxlength="200" value="${U.esc(c.company_name || '')}"></div>
          <div class="row"><div class="field"><label for="c-first">${t('cl_first')}</label><input id="c-first" maxlength="200" required value="${U.esc(c.first_name || '')}" aria-describedby="c-err"></div>
            <div class="field"><label for="c-last">${t('cl_last')}</label><input id="c-last" maxlength="200" value="${U.esc(c.last_name || '')}"></div></div>
          <div class="row"><div class="field"><label for="c-email">${t('email')}</label><input id="c-email" type="email" maxlength="200" value="${U.esc(c.email || '')}" aria-describedby="c-err"></div>
            <div class="field"><label for="c-phone">${t('n_phone')}</label><input id="c-phone" type="tel" maxlength="50" value="${U.esc(c.phone || '')}" aria-describedby="c-phone-h"><span class="sub" id="c-phone-h" style="font-size:12.5px">${t('cl_phone_h')}</span></div></div>
          <div class="field"><label for="c-locale">${t('n_lang')}</label><select id="c-locale"><option value="">—</option>${Object.entries(TC.LANGS).map(([k, v]) => `<option value="${k}" ${k === c.locale ? 'selected' : ''}>${U.esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label for="c-notes">${t('cl_notes')}</label><textarea id="c-notes" maxlength="4000">${U.esc(c.notes || '')}</textarea></div>
          <span class="err" id="c-err" role="alert"></span>
          <div><button class="btn" type="submit">${t('cl_save')}</button></div>
        </form>
        <div class="stack">
          <section class="card pad" aria-labelledby="cr-h"><h2 id="cr-h" style="font-size:16px;font-weight:800;margin-bottom:10px">${t('cl_reqs_t', { n: reqs.length })}</h2>
            ${reqs.length ? `<ul class="plain">${reqs.map(r => `<li><a href="#/dossier/${r.id}"><strong>${U.esc(r.reference)}</strong></a> ${U.badge(r.status)}<br><span class="sub">${U.esc(r.activity ? r.activity.title : t('custom_trip'))} · ${r.date_from ? U.date(r.date_from) : t('no_date')} · ${t('people', { n: r.travelers || 1 })}</span></li>`).join('')}</ul>` : `<p class="sub">${t('cl_noreq')}</p>`}
          </section>
          ${S.merges.length ? `<section class="card pad" aria-labelledby="cm-h"><h2 id="cm-h" style="font-size:16px;font-weight:800;margin-bottom:10px">${t('cl_merged_t')}</h2>
            <ul class="plain">${S.merges.map(m => `<li>${U.esc(full(m.snapshot))} — ${U.dateTime(m.merged_at)} · ${t('cl_moved', { n: m.moved_requests })}</li>`).join('')}</ul></section>` : ''}
        </div>
      </div>`);
  }

  TC.views.clients = {
    load: async params => {
      if (params && params[0]) {
        S.one = await TC.api.getCustomer(Number(params[0]));
        S.merges = S.one ? await TC.api.merges(S.one.id) : [];
        if (S.one && S.one.merged_into_id) { location.replace('#/clients/' + S.one.merged_into_id); }
      } else {
        S.one = null;
        [S.list, S.dups] = await Promise.all([TC.api.customers(), TC.api.duplicates()]);
      }
    },
    html: () => {
      if (S.one) return sheetHtml();
      if (location.hash.split('/')[2]) return U.shell('clients', `<p class="empty">${t('not_found')} <a href="#/clients">${t('cl_back')}</a></p>`);
      return U.shell('clients', `
        <div class="page-head"><div><h1>${t('cl_t')}</h1><p class="sub">${t('cl_d', { n: S.list.length })}</p></div></div>
        ${dupsHtml()}
        <div class="toolbar"><div class="field" style="flex:1 1 260px;max-width:380px"><label for="cq">${t('search')}</label><input id="cq" type="search" value="${U.esc(S.q)}" autocomplete="off" placeholder="${t('cl_q_ph')}"></div></div>
        <div id="clList">${listHtml()}</div>`);
    },
    bind: () => {
      if (!S.one) {
        const q = U.$('#cq'); if (q) q.addEventListener('input', e => { S.q = e.target.value; U.$('#clList').innerHTML = listHtml(); });
        U.$('#main').addEventListener('click', async e => {
          const b = e.target.closest('[data-merge]'); if (!b) return;
          const [keep, merge] = b.dataset.merge.split(':').map(Number);
          const k = S.list.find(c => c.id === keep), m = S.list.find(c => c.id === merge);
          if (!confirm(t('cl_merge_confirm', { keep: full(k), merge: full(m) }))) return;
          b.disabled = true;
          try { const n = await TC.api.mergeCustomers(keep, merge); U.toast(t('cl_merged_ok', { n })); await TC.views.clients.load([]); TC.render(true); }
          catch (err) { b.disabled = false; U.toast(t('save_err', { msg: U.errMsg(err) })); }
        });
        return;
      }
      const c = S.one, f = U.$('#clForm');
      U.$('#c-kind').addEventListener('change', e => { U.$('#c-company-f').hidden = e.target.value !== 'organization'; });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const err = U.$('#c-err');
        const next = {
          kind: U.$('#c-kind').value, company_name: U.$('#c-kind').value === 'organization' ? U.$('#c-company').value.trim() : c.company_name,
          first_name: U.$('#c-first').value.trim(), last_name: U.$('#c-last').value.trim(), email: U.$('#c-email').value.trim().toLowerCase(),
          phone: U.$('#c-phone').value.trim(), locale: U.$('#c-locale').value, notes: U.$('#c-notes').value.trim()
        };
        if (!next.first_name) { err.textContent = t('e_name'); U.$('#c-first').focus(); return; }
        if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) { err.textContent = t('e_email'); U.$('#c-email').focus(); return; }
        const patch = U.patchOf(c, next);
        if (!Object.keys(patch).length) { U.toast(t('cl_nochange')); return; }
        err.textContent = ''; const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
        try { await TC.api.updateCustomer(c.id, patch); U.toast(t('saved')); await TC.views.clients.load([c.id]); TC.render(true); }
        catch (e2) { btn.disabled = false; err.textContent = /duplicate|unique/i.test(U.errMsg(e2)) ? t('cl_email_taken') : t('save_err', { msg: U.errMsg(e2) }); }
      });
    }
  };
})(window.TC);
