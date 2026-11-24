/* Équipe (administrateur seulement) : membres, rôles, activation ; ajout d'un membre par l'Edge Function « ajouter-membre »
   (la clé de service reste côté serveur). Le mot de passe provisoire est affiché une seule fois ; le membre le change à la 1re connexion. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const S = { list: [], guides: [], created: null };
  const ROLES = ['admin', 'conseiller', 'guide'];

  TC.views.equipe = {
    load: async () => { [S.list, S.guides] = await Promise.all([TC.api.sel('staff', 'id,email,full_name,role,is_active,guide_id,created_at', q => q.order('full_name')), TC.api.sel('guides', 'id,first_name,last_name', q => q.order('first_name'))]); },
    html: () => {
      if (TC.state.me.role !== 'admin') return U.shell('equipe', `<p class="empty">${t('not_found')}</p>`);
      const me = TC.state.me.id;
      return U.shell('equipe', `<div class="page-head"><div><h1>${t('eq_t')}</h1><p class="sub">${t('eq_d')}</p></div></div>
        ${S.created ? `<div class="alert good" role="status" id="eqCreated" tabindex="-1" style="display:flex;flex-direction:column;gap:8px"><strong>${t('eq_created', { e: U.esc(S.created.email) })}</strong>
          <span>${t('eq_temp_pw')} <code id="eqPw" style="font-size:18px">${U.esc(S.created.password)}</code></span><span class="sub">${t('eq_temp_d')}</span>
          <div><button type="button" class="btn ghost small" id="eqCopy">${t('copy')}</button></div></div>` : ''}
        <div class="grid2"><div class="tscroll"><table class="t"><caption class="sr">${t('eq_t')}</caption><thead><tr><th scope="col">${t('eq_name')}</th><th scope="col">${t('email')}</th><th scope="col">${t('eq_role')}</th><th scope="col">${t('fl_state')}</th></tr></thead>
          <tbody>${S.list.map(s => `<tr${s.is_active ? '' : ' style="opacity:.6"'}><th scope="row">${U.esc(s.full_name)}</th><td>${U.esc(s.email)}</td><td>${t('role_' + s.role)}</td>
            <td>${s.id === me ? t('eq_you') : `<button type="button" class="btn ${s.is_active ? 'quiet' : 'ghost'} small" data-eqactive="${s.id}">${s.is_active ? t('fl_deactivate') : t('fl_activate')}<span class="sr"> ${U.esc(s.full_name)}</span></button>`}</td></tr>`).join('')}</tbody></table></div>
        <form id="eqNew" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:16px;font-weight:800">${t('eq_new')}</h2>
          <div class="field"><label for="eq-name">${t('eq_name')}</label><input id="eq-name" maxlength="200" required aria-describedby="eq-err"></div>
          <div class="field"><label for="eq-email">${t('email')}</label><input id="eq-email" type="email" maxlength="200" required autocomplete="off"></div>
          <div class="field"><label for="eq-role">${t('eq_role')}</label><select id="eq-role">${ROLES.map(r => `<option value="${r}" ${r === 'conseiller' ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div>
          <div class="field" id="eq-guide-f" hidden><label for="eq-guide">${t('eq_guide')}</label><select id="eq-guide"><option value="">—</option>${S.guides.map(g => `<option value="${g.id}">${U.esc(U.guideName(g))}</option>`).join('')}</select></div>
          <span class="err" id="eq-err" role="alert"></span><div><button class="btn" type="submit">${t('eq_add')}</button></div></form></div>`);
    },
    bind: () => {
      if (TC.state.me.role !== 'admin') return;
      const created = U.$('#eqCreated'); if (created) created.focus();
      const cp = U.$('#eqCopy'); if (cp) cp.addEventListener('click', () => navigator.clipboard.writeText(S.created.password).then(() => U.toast(t('copied'))));
      U.$('#eq-role').addEventListener('change', e => { U.$('#eq-guide-f').hidden = e.target.value !== 'guide'; });
      U.$('#main').addEventListener('click', async e => {
        const b = e.target.closest('[data-eqactive]'); if (!b) return;
        const s = S.list.find(x => x.id === b.dataset.eqactive);
        if (s.is_active && !confirm(t('eq_deact_confirm', { n: s.full_name }))) return;
        try { await TC.api.upd('staff', s.id, { is_active: !s.is_active }); U.toast(t('saved')); S.created = null; await TC.views.equipe.load(); TC.render(true); }
        catch (err) { U.toast(t('save_err', { msg: U.errMsg(err) })); }
      });
      U.$('#eqNew').addEventListener('submit', async e => {
        e.preventDefault();
        const err = U.$('#eq-err'), body = { full_name: U.$('#eq-name').value.trim(), email: U.$('#eq-email').value.trim().toLowerCase(), role: U.$('#eq-role').value, guide_id: Number(U.$('#eq-guide').value) || null };
        if (!body.full_name) { err.textContent = t('sp_need_name'); U.$('#eq-name').focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) { err.textContent = t('e_email'); U.$('#eq-email').focus(); return; }
        const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        const { data, error } = await TC.api.sb.functions.invoke('ajouter-membre', { body });
        btn.disabled = false;
        if (error || !data || !data.password) {
          let code = ''; try { code = (await error.context.json()).error; } catch { /* réponse illisible */ }
          err.textContent = code === 'exists' ? t('eq_exists') : t('save_err', { msg: code || (error && error.message) || '?' }); return;
        }
        S.created = data; await TC.views.equipe.load(); TC.render(true);
      });
    }
  };

  // Mot de passe provisoire : à la 1re connexion, le membre doit en choisir un nouveau
  TC.mustChangePassword = async () => { const { data } = await TC.api.sb.auth.getUser(); return !!(data && data.user && data.user.user_metadata && data.user.user_metadata.must_change_password); };
})(window.TC);
