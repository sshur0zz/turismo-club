/* Production d'un dossier (s'ajoute à la fiche demande, sans modifier ses sections existantes) :
   statut fournisseur de chaque prestation, vouchers numérotés et figés, tâches du dossier ; page « voucher » imprimable.
   Les règles (transitions, référence obligatoire, numérotation) sont dans la base : l'écran ne fait que proposer. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const NEXT = { draft: ['requested', 'cancelled'], requested: ['option', 'confirmed', 'refused', 'cancelled'], option: ['confirmed', 'refused', 'cancelled'],
    confirmed: ['cancelled'], issued: ['cancelled'], refused: ['requested'], cancelled: [] };
  const badge = s => `<span class="badge sup-${s}">${t('sup_' + s)}</span>`;
  const errText = e => { const m = U.errMsg(e); return /P0409|Transition|référence|échéance|fournisseur|voucher/i.test(m) ? m.replace(/^.*?: /, '') : t('save_err', { msg: m }); };

  TC.prod = {
    load: async d => {
      const [v, tk, sp] = await Promise.all([
        TC.api.sel('vouchers', 'id,number,item_id,issued_at', q => q.eq('request_id', d.id)),
        TC.api.sel('tasks', 'id,title,due_date,assigned_to,done_at', q => q.eq('request_id', d.id).order('done_at', { nullsFirst: true }).order('due_date', { nullsFirst: false })),
        TC.state.suppliersList ? Promise.resolve(TC.state.suppliersList) : TC.api.sel('suppliers', 'id,name,kind', q => q.eq('is_active', true).order('name'))]);
      d.vouchers = v; d.tasks = tk; TC.state.suppliersList = sp;
    },
    html: D => {
      const sps = TC.state.suppliersList || [];
      const items = D.items.map(i => {
        const v = (D.vouchers || []).find(x => x.item_id === i.id), locked = ['confirmed', 'issued', 'cancelled'].includes(i.supplier_status);
        return `<li class="prodrow" data-item="${i.id}">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between"><strong>${U.esc(i.label)}</strong>${badge(i.supplier_status)}</div>
          <div class="row">
            <div class="field"><label for="ps-${i.id}">${t('sup_supplier')}</label><select id="ps-${i.id}" ${locked ? 'disabled' : ''}><option value="">—</option>${sps.map(s => `<option value="${s.id}" ${s.id === i.supplier_id ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label for="pr-${i.id}">${t('sup_ref')}</label><input id="pr-${i.id}" maxlength="120" value="${U.esc(i.supplier_ref || '')}" ${locked ? 'readonly' : ''}></div>
            <div class="field"><label for="po-${i.id}">${t('sup_option')}</label><input id="po-${i.id}" type="date" value="${U.esc(i.option_until || '')}" ${locked ? 'readonly' : ''}></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            ${NEXT[i.supplier_status].map(s => `<button type="button" class="btn ${s === 'cancelled' || s === 'refused' ? 'quiet' : 'ghost'} small" data-sup="${i.id}:${s}">${t('supb_' + s)}<span class="sr"> — ${U.esc(i.label)}</span></button>`).join('')}
            ${i.supplier_status === 'confirmed' && !v ? `<button type="button" class="btn small" data-voucher="${i.id}">${t('sup_issue')}<span class="sr"> — ${U.esc(i.label)}</span></button>` : ''}
            ${v ? `<a class="btn ghost small" href="#/voucher/${v.id}">${t('sup_voucher_open', { n: v.number })}</a>` : ''}
            ${i.option_until && i.supplier_status === 'option' ? `<span class="sub">${t('sup_option_until', { d: U.date(i.option_until) })}</span>` : ''}
          </div></li>`;
      }).join('');
      const me = TC.state.me;
      const tasks = (D.tasks || []).map(k => { const late = !k.done_at && k.due_date && k.due_date < U.todayRome(); const who = TC.state.team.find(s => s.id === k.assigned_to);
        return `<li class="duprow"><label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" data-task="${k.id}" ${k.done_at ? 'checked disabled' : ''} style="width:20px;height:20px;accent-color:var(--accent)">
          <span${k.done_at ? ' style="text-decoration:line-through;color:var(--ink-2)"' : ''}>${U.esc(k.title)}</span></label>
          <span class="sub">${k.due_date ? `<span${late ? ' class="late"' : ''}>${late ? t('tk_late') + ' · ' : ''}${U.date(k.due_date)}</span>` : t('tk_nodue')} · ${who ? U.esc(who.full_name) : t('nobody')}</span></li>`; }).join('');
      return `<section class="card pad sec" aria-labelledby="h-prod"><h2 id="h-prod">${t('sup_t')}</h2><p class="sub" style="margin:0 0 10px">${t('sup_d')}</p>
          ${D.items.length ? `<ul class="plain">${items}</ul>` : `<p class="sub">${t('it_none')}</p>`}
          ${sps.length ? '' : `<p class="sub">${t('sup_no_sp')} <a href="#/fournisseurs">${t('nav_suppliers')}</a></p>`}
          <span class="err" id="prod-err" role="alert"></span></section>
        <section class="card pad sec" aria-labelledby="h-tasks"><h2 id="h-tasks">${t('tk_t')}</h2>
          ${(D.tasks || []).length ? `<ul class="plain">${tasks}</ul>` : `<p class="sub">${t('tk_none')}</p>`}
          <form id="taskForm" novalidate style="display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px;margin-top:10px">
            <div class="row"><div class="field"><label for="tk-title">${t('tk_title')}</label><input id="tk-title" maxlength="200" required aria-describedby="tk-err"></div>
              <div class="field"><label for="tk-due">${t('tk_due')}</label><input id="tk-due" type="date"></div>
              <div class="field"><label for="tk-who">${t('owner')}</label><select id="tk-who"><option value="">${t('nobody')}</option>${TC.state.team.map(s => `<option value="${s.id}" ${s.id === me.id ? 'selected' : ''}>${U.esc(s.full_name)}</option>`).join('')}</select></div></div>
            <span class="err" id="tk-err" role="alert"></span><div><button class="btn ghost" type="submit">${t('tk_add')}</button></div></form></section>`;
    },
    bind: (D, reload) => {
      const main = U.$('#main');
      main.addEventListener('click', async e => {
        const b = e.target.closest('[data-sup],[data-voucher]'); if (!b) return;
        const errEl = U.$('#prod-err'); errEl.textContent = '';
        try {
          if (b.dataset.voucher) { const id = await TC.api.rpc('issue_voucher', { p_item: Number(b.dataset.voucher) }); U.toast(t('sup_issued')); location.hash = '#/voucher/' + id; return; }
          const [id, status] = b.dataset.sup.split(':'), it = D.items.find(x => x.id === Number(id));
          const next = { supplier_id: U.$('#ps-' + id).value ? Number(U.$('#ps-' + id).value) : null, supplier_ref: U.$('#pr-' + id).value.trim(), option_until: U.$('#po-' + id).value, supplier_status: status };
          if (status === 'cancelled' && !confirm(t('sup_cancel_confirm'))) return;
          const patch = U.patchOf(it, next);
          await TC.api.updateItem(it.id, patch); U.toast(t('saved')); await reload();
        } catch (err) { errEl.textContent = errText(err); }
      });
      main.addEventListener('change', async e => {
        const c = e.target.closest('[data-task]'); if (!c || !c.checked) return;
        try { await TC.api.upd('tasks', Number(c.dataset.task), { done_at: new Date().toISOString() }); U.toast(t('saved')); if (TC.refreshTaskCount) await TC.refreshTaskCount(); await reload(); }
        catch (err) { c.checked = false; U.toast(t('save_err', { msg: U.errMsg(err) })); }
      });
      U.$('#taskForm').addEventListener('submit', async e => {
        e.preventDefault();
        const title = U.$('#tk-title').value.trim(); if (!title) { U.$('#tk-err').textContent = t('tk_need'); U.$('#tk-title').focus(); return; }
        try { await TC.api.ins('tasks', { title, due_date: U.$('#tk-due').value || null, assigned_to: U.$('#tk-who').value || null, request_id: D.id, customer_id: D.customer_id || null }); U.toast(t('saved')); if (TC.refreshTaskCount) await TC.refreshTaskCount(); await reload(); }
        catch (err) { U.$('#tk-err').textContent = t('save_err', { msg: U.errMsg(err) }); }
      });
    }
  };

  // ---------- Voucher imprimable (sans prix) ----------
  let V = null;
  TC.views.voucher = {
    load: async params => { V = await TC.api.sel('vouchers', '*', q => q.eq('id', Number(params[0])).maybeSingle()); },
    html: () => {
      if (!V) return U.shell('demandes', `<p class="empty">${t('not_found')}</p>`);
      const c = V.content;
      const row = (k, v) => v ? `<tr><th scope="row">${t(k)}</th><td>${U.esc(v)}</td></tr>` : '';
      return U.shell('demandes', `<p class="noprint" style="margin:0 0 10px"><a href="#/dossier/${V.request_id}">${t('back')}</a></p>
        <article class="card pad voucher" aria-labelledby="v-h">
          <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start"><div style="width:200px">${U.logo()}</div>
            <div style="text-align:right"><h1 id="v-h" style="font-size:22px">${t('vo_t')}</h1><p style="margin:0;font-size:20px;font-weight:800">${U.esc(V.number)}</p><p class="sub" style="margin:0">${t('vo_issued', { d: U.dateTime(V.issued_at) })}</p></div></div>
          <table class="t" style="margin-top:16px"><tbody>
            ${row('vo_client', c.client)}${row('vo_ref', c.reference)}${row('vo_service', c.service)}
            ${row('vo_date', c.date ? U.date(c.date) + (c.time ? ' · ' + c.time : '') : '')}${row('vo_people', c.people != null ? String(c.people) : '')}
            ${row('vo_hotel', c.hotel)}${row('vo_supplier', c.supplier)}${row('vo_sup_ref', c.supplier_ref)}${row('vo_sup_phone', c.supplier_phone)}${row('vo_sup_addr', c.supplier_address)}
          </tbody></table>
          <p class="sub" style="margin-top:16px">${t('vo_note')}</p></article>
        <p class="noprint" style="margin-top:12px"><button type="button" class="btn" id="vPrint">${t('vo_print')}</button></p>`);
    },
    bind: () => { const b = U.$('#vPrint'); if (b) b.addEventListener('click', () => window.print()); }
  };
})(window.TC);
