/* Tâches : « mes tâches » (ou toute l'équipe), en retard en premier, liées ou non à un dossier. Table « tasks ». */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const S = { list: [], who: 'me', done: false };

  function rows() {
    const me = TC.state.me.id, today = U.todayRome();
    const list = S.list.filter(k => (S.done ? !!k.done_at : !k.done_at) && (S.who === 'all' || k.assigned_to === me || (!k.assigned_to && S.who === 'me')));
    if (!list.length) return `<p class="empty">${S.done ? t('tk_none_done') : t('tk_none_open')}</p>`;
    return `<ul class="plain card pad">${list.map(k => { const late = !k.done_at && k.due_date && k.due_date < today; const who = TC.state.team.find(s => s.id === k.assigned_to);
      return `<li class="duprow"><label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" data-tdone="${k.id}" ${k.done_at ? 'checked disabled' : ''} style="width:20px;height:20px;accent-color:var(--accent)">
        <span${k.done_at ? ' style="text-decoration:line-through;color:var(--ink-2)"' : ''}><strong>${U.esc(k.title)}</strong>${k.request ? ` · <a href="#/dossier/${k.request.id}">${U.esc(k.request.reference)} ${U.esc(U.name(k.request))}</a>` : ''}</span></label>
        <span class="sub">${k.due_date ? `<span${late ? ' class="late"' : ''}>${late ? t('tk_late') + ' · ' : ''}${U.date(k.due_date)}</span>` : t('tk_nodue')} · ${who ? U.esc(who.full_name) : t('nobody')}</span></li>`; }).join('')}</ul>`;
  }

  TC.views.taches = {
    load: async () => {
      S.list = await TC.api.sel('tasks', 'id,title,due_date,assigned_to,done_at,created_at,request:quote_requests(id,reference,first_name,last_name)',
        q => q.order('due_date', { ascending: true, nullsFirst: false }).order('created_at').limit(500));
    },
    countOpenMine: async () => { const me = TC.state.me.id;
      const { count } = await TC.api.sb.from('tasks').select('id', { count: 'exact', head: true }).is('done_at', null).or(`assigned_to.eq.${me},assigned_to.is.null`); return count || 0; },
    html: () => U.shell('taches', `
      <div class="page-head"><div><h1>${t('tk_page')}</h1><p class="sub">${t('tk_page_d')}</p></div></div>
      <div class="toolbar">
        <div role="group" aria-label="${t('tk_who')}" class="chips">${['me', 'all'].map(w => `<button type="button" class="chip" data-who="${w}" aria-pressed="${S.who === w}">${t('tk_who_' + w)}</button>`).join('')}</div>
        <div role="group" aria-label="${t('tk_state')}" class="chips">${[false, true].map(d => `<button type="button" class="chip" data-done="${d}" aria-pressed="${S.done === d}">${t(d ? 'tk_done' : 'tk_open')}</button>`).join('')}</div>
      </div>
      <div id="tkList">${rows()}</div>
      <form id="tkNew" class="card pad" novalidate style="display:flex;flex-direction:column;gap:10px;margin-top:16px;max-width:860px"><h2 style="font-size:16px;font-weight:800">${t('tk_add')}</h2>
        <div class="row"><div class="field"><label for="tn-title">${t('tk_title')}</label><input id="tn-title" maxlength="200" required aria-describedby="tn-err"></div>
          <div class="field"><label for="tn-due">${t('tk_due')}</label><input id="tn-due" type="date"></div>
          <div class="field"><label for="tn-who">${t('owner')}</label><select id="tn-who"><option value="">${t('nobody')}</option>${TC.state.team.map(s => `<option value="${s.id}" ${s.id === TC.state.me.id ? 'selected' : ''}>${U.esc(s.full_name)}</option>`).join('')}</select></div></div>
        <span class="err" id="tn-err" role="alert"></span><div><button class="btn" type="submit">${t('tk_add')}</button></div></form>`),
    bind: () => {
      const main = U.$('#main');
      main.addEventListener('click', e => {
        const w = e.target.closest('[data-who]'), d = e.target.closest('[data-done]');
        if (w) S.who = w.dataset.who; if (d) S.done = d.dataset.done === 'true';
        if (w || d) { U.$$('[data-who]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.who === S.who))); U.$$('[data-done]').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.done === 'true') === S.done))); U.$('#tkList').innerHTML = rows(); }
      });
      main.addEventListener('change', async e => {
        const c = e.target.closest('[data-tdone]'); if (!c || !c.checked) return;
        try { await TC.api.upd('tasks', Number(c.dataset.tdone), { done_at: new Date().toISOString() }); U.toast(t('saved')); await TC.views.taches.load(); U.$('#tkList').innerHTML = rows(); TC.refreshTaskCount && TC.refreshTaskCount(); }
        catch (err) { c.checked = false; U.toast(t('save_err', { msg: U.errMsg(err) })); }
      });
      U.$('#tkNew').addEventListener('submit', async e => {
        e.preventDefault();
        const title = U.$('#tn-title').value.trim(); if (!title) { U.$('#tn-err').textContent = t('tk_need'); U.$('#tn-title').focus(); return; }
        try { await TC.api.ins('tasks', { title, due_date: U.$('#tn-due').value || null, assigned_to: U.$('#tn-who').value || null }); U.toast(t('saved')); await TC.views.taches.load(); TC.render(true); TC.refreshTaskCount && TC.refreshTaskCount(); }
        catch (err) { U.$('#tn-err').textContent = t('save_err', { msg: U.errMsg(err) }); }
      });
    }
  };
})(window.TC);
