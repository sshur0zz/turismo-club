/* Demandes : tableau en colonnes (Nouvelles → En cours → Devis envoyé → Confirmée [+ Terminée, Annulée]) */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const TYPES = ['all', 'activity', 'bus', 'circuit', 'hotel', 'restaurant', 'transfer', 'custom'];
  const f = { type: 'all', q: '', closed: false }; // filtres (gardés pendant la session)

  function card(r) {
    const owner = TC.state.team.find(s => s.id === r.assigned_staff_id);
    const late = r.status === 'new' && U.hoursSince(r.created_at) > 12;
    const lang = r.preferred_language || r.language;
    return `<article class="qcard" data-id="${r.id}" draggable="true" aria-roledescription="${t('drag_card')}">
      <div class="top">${U.src(r.source)}<span class="age${late ? ' late' : ''}" title="${U.esc(U.dateTime(r.created_at))}">${U.ago(r.created_at)}</span></div>
      <a class="name" href="#/dossier/${r.id}">${U.esc(U.name(r))}</a>
      <div class="meta">${U.esc(U.offerLabel(r))}</div>
      <div class="meta">${t('people', { n: r.travelers || 1 })} · ${r.date_from ? U.date(r.date_from) : t('no_date')} · ${U.esc(U.langName(lang))}</div>
      <div class="meta">${t('owner')} : ${owner ? U.esc(owner.full_name) : t('nobody')}</div>
      ${r.status === 'lost' && r.lost_reason ? `<div class="meta"><strong>${t('lost_short')}</strong> ${U.esc(r.lost_reason)}</div>` : ''}
      <label class="sr" for="st-${r.id}">${t('step')} — ${U.esc(U.name(r))}</label>
      <select id="st-${r.id}" data-status="${r.id}">${U.STATUSES.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${t('st1_' + s)}</option>`).join('')}</select>
    </article>`;
  }

  function board() {
    const q = f.q.trim().toLowerCase();
    const list = TC.state.requests.filter(r =>
      (f.type === 'all' || U.typeOf(r) === f.type) && (!q || U.name(r).toLowerCase().includes(q)));
    const cols = ['new', 'in_progress', 'sent', 'won'].concat(f.closed ? ['done', 'lost'] : []);
    if (!TC.state.requests.length) return `<p class="empty">${t('none_at_all')}</p>`;
    return `<div class="board" style="--cols:${cols.length}">${cols.map(s => {
      const items = list.filter(r => r.status === s);
      return `<section class="col" data-col="${s}" aria-labelledby="col-${s}"><h2 id="col-${s}"><span>${t('st_' + s)}</span><span class="badge st-${s}">${items.length}</span></h2>
        ${items.length ? items.map(card).join('') : `<p class="meta" style="padding:6px;color:var(--ink-2)">${t('col_empty')}</p>`}</section>`;
    }).join('')}</div>`;
  }

  TC.views.demandes = {
    html: () => U.shell('demandes', `
      <div class="page-head"><div><h1>${t('req_t')}</h1><p class="sub">${t('req_d')}</p></div>
        <a class="btn" href="#/nouvelle">${t('nav_new')}</a></div>
      <div class="toolbar">
        <div class="field" style="flex:1 1 220px;max-width:320px"><label for="q">${t('search')}</label><input id="q" type="search" value="${U.esc(f.q)}" autocomplete="off"></div>
        <div role="group" aria-label="${t('filter_type')}" class="chips">${TYPES.map(k => `<button type="button" class="chip" data-type="${k}" aria-pressed="${f.type === k}">${t('ty_' + k)}</button>`).join('')}</div>
        <label style="display:flex;align-items:center;gap:8px;min-height:44px;font-weight:600"><input type="checkbox" id="closed" ${f.closed ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"> ${t('show_closed')}</label>
      </div>
      <div id="board">${board()}</div>`),
    refresh: () => { const b = U.$('#board'); if (b) b.innerHTML = board(); },
    bind: () => {
      const main = U.$('#main');
      U.$('#q').addEventListener('input', e => { f.q = e.target.value; TC.views.demandes.refresh(); });
      U.$('#closed').addEventListener('change', e => { f.closed = e.target.checked; TC.views.demandes.refresh(); });
      main.addEventListener('click', e => {
        const b = e.target.closest('[data-type]'); if (!b) return;
        f.type = b.dataset.type;
        U.$$('[data-type]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.type === f.type)));
        TC.views.demandes.refresh();
      });
      // Changement d'étape : liste (clavier) ou glisser-déposer (souris / tactile) → même enregistrement
      async function move(id, status) {
        const r = TC.state.requests.find(x => x.id === id); if (!r || r.status === status) { TC.views.demandes.refresh(); return; }
        const patch = await U.statusPatch(status);
        if (!patch) { TC.views.demandes.refresh(); const s = U.$(`#st-${id}`); if (s) s.focus(); return; }   // motif refusé : on n'enregistre rien
        const old = { status: r.status, lost_reason: r.lost_reason };
        Object.assign(r, patch);
        try { await TC.api.updateRequest(id, patch); U.toast(t('saved')); }
        catch (err) { Object.assign(r, old); U.toast(t('save_err', { msg: U.errMsg(err) })); }
        TC.views.demandes.refresh(); TC.refreshCount();
        const again = U.$(`#st-${id}`); if (again) again.focus();
      }
      main.addEventListener('change', e => {
        const s = e.target.closest('[data-status]'); if (!s) return;
        if (s.value === 'lost' && !f.closed) { f.closed = true; U.$('#closed').checked = true; }
        move(Number(s.dataset.status), s.value);
      });
      main.addEventListener('dragstart', e => {
        const c = e.target.closest('.qcard'); if (!c) return;
        e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging');
      });
      main.addEventListener('dragend', e => { const c = e.target.closest('.qcard'); if (c) c.classList.remove('dragging'); U.$$('.col.over').forEach(x => x.classList.remove('over')); });
      main.addEventListener('dragover', e => { const col = e.target.closest('.col[data-col]'); if (!col) return; e.preventDefault(); U.$$('.col.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
      main.addEventListener('drop', e => {
        const col = e.target.closest('.col[data-col]'); if (!col) return; e.preventDefault(); col.classList.remove('over');
        const id = Number(e.dataTransfer.getData('text/plain')); if (id) move(id, col.dataset.col);
      });
    }
  };
})(window.TC);
