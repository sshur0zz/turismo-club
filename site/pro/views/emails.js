/* E-mails reçus (transférés par Gmail → demandes@in.turismoclub.it) : lire, créer une demande, lier, traiter, ignorer.
   La réponse se fait dans Gmail (bouton « Répondre dans Gmail »). */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const E = { list: [], filter: 'new', sel: null, q: '' };
  const FILTERS = ['new', 'all', 'done', 'ignored'];

  const shown = () => E.list.filter(m => (E.filter === 'all' ? true : E.filter === 'new' ? (m.status === 'new' || m.status === 'read') : m.status === E.filter) &&
    (!E.q || `${m.from_name || ''} ${m.from_email} ${m.subject || ''}`.toLowerCase().includes(E.q.toLowerCase())));
  const cur = () => E.list.find(m => m.id === E.sel);
  // Liens cliquables dans le texte (en particulier le lien de confirmation envoyé par Gmail)
  const linkify = s => U.esc(s).replace(/https?:\/\/[^\s<>"']+/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  const gmailReply = m => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.from_email) + '&su=' + encodeURIComponent('Re: ' + (m.subject || ''));

  function reader() {
    const m = cur();
    if (!m) return `<p class="sub">${t('em_pick')}</p>`;
    const linked = m.request_id ? TC.state.requests.find(r => r.id === m.request_id) : null;
    const sameSender = TC.state.requests.filter(r => r.email && r.email.toLowerCase() === m.from_email && r.id !== m.request_id).slice(0, 5);
    return `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px">
        <div><h2 style="font-size:19px">${U.esc(m.subject || t('em_nosubj'))}</h2>
          <p class="sub" style="margin:4px 0 0"><strong style="color:var(--ink)">${U.esc(m.from_name || m.from_email)}</strong> &lt;${U.esc(m.from_email)}&gt; · ${U.dateTime(m.received_at)}${m.attachments ? ' · ' + t('em_att', { n: m.attachments }) : ''}</p></div>
        <span class="badge ${m.status === 'done' ? 'st-won' : m.status === 'ignored' ? 'st-lost' : 'st-new'}">${t('ems_' + m.status)}</span></div>
      <div class="mailbody">${linkify(m.body_text || '')}</div>
      ${linked ? `<p class="alert good" style="margin:0">${t('em_linked')} <a href="#/dossier/${linked.id}">${U.esc(linked.reference)} · ${U.esc(U.name(linked))}</a></p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:14px">
        ${linked ? '' : `<button type="button" class="btn" id="emCreate">${t('em_create')}</button>`}
        <a class="btn ghost" href="${U.esc(gmailReply(m))}" target="_blank" rel="noopener">${t('em_reply')}</a>
        ${m.status !== 'done' ? `<button type="button" class="btn quiet" data-emstatus="done">${t('em_done')}</button>` : ''}
        ${m.status !== 'ignored' ? `<button type="button" class="btn quiet" data-emstatus="ignored">${t('em_ignore')}</button>` : `<button type="button" class="btn quiet" data-emstatus="read">${t('em_restore')}</button>`}
      </div>
      ${!linked ? `<form id="emLinkForm" style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">
        <div class="field" style="flex:1 1 240px"><label for="emLink">${t('em_link')}</label><select id="emLink"><option value="">${t('choose')}</option>
          ${sameSender.map(r => `<option value="${r.id}">${U.esc(r.reference)} · ${U.esc(U.name(r))} (${t('em_same')})</option>`).join('')}
          ${TC.state.requests.filter(r => !sameSender.includes(r) && !['done', 'lost'].includes(r.status)).slice(0, 40).map(r => `<option value="${r.id}">${U.esc(r.reference)} · ${U.esc(U.name(r))}</option>`).join('')}</select></div>
        <button class="btn quiet" type="submit">${t('em_link_b')}</button></form>` : ''}`;
  }

  function listHtml() {
    const l = shown();
    if (!E.list.length) return `<p class="empty" style="margin:0">${t('em_none')}</p>`;
    if (!l.length) return `<p class="sub" style="padding:12px">${t('em_none_filter')}</p>`;
    return l.map(m => `<button type="button" class="mrow${m.id === E.sel ? ' on' : ''}${m.status === 'new' ? ' unread' : ''}" data-em="${m.id}">
      <span class="mtop"><span class="mfrom">${U.esc(m.from_name || m.from_email)}</span><span class="mwhen">${U.ago(m.received_at)}</span></span>
      <span class="msubj">${U.esc(m.subject || t('em_nosubj'))}</span>
      <span class="mprev">${U.esc((m.body_text || '').replace(/\s+/g, ' ').slice(0, 90))}</span>
      ${m.request_id ? `<span class="badge st-won" style="width:max-content">${t('em_has_req')}</span>` : ''}</button>`).join('');
  }

  async function setStatus(m, status) {
    try { await TC.api.updateEmail(m.id, { status }); m.status = status; TC.refreshEmailCount(); }
    catch (e) { U.toast(t('save_err', { msg: U.errMsg(e) })); }
  }

  TC.views.emails = {
    load: async params => {
      E.list = await TC.api.emails();
      if (!TC.state.requests.length) TC.state.requests = await TC.api.listRequests();
      if (params && params[0]) E.sel = Number(params[0]);
      if (E.sel && !E.list.some(m => m.id === E.sel)) E.sel = null;
    },
    refresh: async () => { E.list = await TC.api.emails(); TC.render(true); },
    html: () => U.shell('emails', `
      <div class="page-head"><div><h1>${t('em_t')}</h1><p class="sub">${t('em_d')}</p></div>
        <a class="btn ghost" href="https://mail.google.com/" target="_blank" rel="noopener">${t('em_open_gmail')}</a></div>
      <div class="toolbar">
        <div class="field" style="flex:1 1 220px;max-width:320px"><label for="emq">${t('search')}</label><input id="emq" type="search" value="${U.esc(E.q)}" autocomplete="off"></div>
        <div role="group" aria-label="${t('filter_type')}" class="chips">${FILTERS.map(k => `<button type="button" class="chip" data-emf="${k}" aria-pressed="${E.filter === k}">${t('emf_' + k)}</button>`).join('')}</div>
      </div>
      <div class="mailgrid">
        <section class="card maillist" aria-label="${t('em_t')}">${listHtml()}</section>
        <article class="card pad mailread" aria-live="polite" style="display:flex;flex-direction:column;gap:14px">${reader()}</article>
      </div>`),
    bind: () => {
      const main = U.$('#main');
      U.$('#emq').addEventListener('input', e => { E.q = e.target.value; U.$('.maillist').innerHTML = listHtml(); });
      main.addEventListener('click', async e => {
        const f = e.target.closest('[data-emf]');
        if (f) { E.filter = f.dataset.emf; TC.render(true); return; }
        const row = e.target.closest('[data-em]');
        if (row) {
          E.sel = Number(row.dataset.em); const m = cur();
          if (m.status === 'new') await setStatus(m, 'read');
          TC.render(true); const h = U.$('.mailread h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } return;
        }
        const st = e.target.closest('[data-emstatus]');
        if (st) { await setStatus(cur(), st.dataset.emstatus); U.toast(t('saved')); TC.render(true); return; }
        if (e.target.closest('#emCreate')) {
          const m = cur();
          TC.state.prefill = Object.assign(TC.parseEmail(`De : ${m.from_name || ''} <${m.from_email}>\n\n${m.body_text || ''}`, { name: m.from_name, email: m.from_email, subject: m.subject }), { source: 'email', emailId: m.id });
          location.hash = '#/nouvelle';
        }
      });
      const lf = U.$('#emLinkForm');
      if (lf) lf.addEventListener('submit', async e => {
        e.preventDefault(); const id = Number(U.$('#emLink').value); if (!id) return;
        try { await TC.api.updateEmail(cur().id, { request_id: id, status: 'done' }); U.toast(t('saved')); await TC.views.emails.refresh(); TC.refreshEmailCount(); }
        catch (err) { U.toast(t('save_err', { msg: U.errMsg(err) })); }
      });
    }
  };
})(window.TC);
