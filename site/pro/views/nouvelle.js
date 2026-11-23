/* Nouvelle demande saisie par l'équipe (téléphone, WhatsApp, e-mail, agence).
   Étape 1 facultative : coller un e-mail copié depuis Gmail → les champs reconnus sont pré-remplis (et surlignés).
   Depuis la rubrique E-mails, « Créer une demande » arrive ici déjà pré-rempli (TC.state.prefill). */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const FIELDS = { name: 'n-name', email: 'n-email', phone: 'n-phone', offer_slug: 'n-offer', date: 'n-date', people: 'n-people', lang: 'n-lang' };

  function applyParsed(p) {
    U.$$('.autof').forEach(el => el.classList.remove('autof')); U.$$('.autotag').forEach(el => el.remove());
    for (const [k, id] of Object.entries(FIELDS)) {
      if (!p[k]) continue;
      const el = U.$('#' + id); if (!el) continue;
      if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === p[k])) continue;
      el.value = p[k]; el.classList.add('autof');
      const lab = U.$(`label[for="${id}"]`); if (lab) lab.insertAdjacentHTML('beforeend', ` <span class="autotag">${t('paste_auto')}</span>`);
    }
    if (p.message) { U.$('#n-msg').value = p.message; U.$('#n-msg').classList.add('autof'); }
    U.$('#n-source').value = p.source || 'email'; U.$('#n-source').classList.add('autof');
    const n = p.found.length;
    U.$('#paste-ok').textContent = n ? t('paste_ok', { n }) : t('paste_none');
    U.$('#paste-ok').hidden = false;
  }

  TC.views.nouvelle = {
    html: () => U.shell('demandes', `
      <p style="margin:0 0 10px"><a href="#/demandes">${t('back')}</a></p>
      <div class="page-head"><div><h1>${t('new_t')}</h1><p class="sub">${t('new_d')}</p></div></div>
      <section class="card pad" aria-labelledby="paste-h" style="display:flex;flex-direction:column;gap:10px;max-width:860px;margin-bottom:16px">
        <h2 id="paste-h" style="font-size:16px;font-weight:800">${t('paste_t')}</h2>
        <p class="sub" style="margin:0;font-size:14px">${t('paste_d')}</p>
        <div class="field"><label for="paste">${t('paste_l')}</label><textarea id="paste" style="min-height:130px" maxlength="20000"></textarea></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="btn" id="pasteFill">${t('paste_b')}</button>
          <button type="button" class="btn quiet" id="pasteClear">${t('paste_clear')}</button>
          <span id="paste-ok" class="badge st-won" role="status" hidden></span></div>
      </section>
      <form id="newForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px;max-width:860px">
        <h2 style="font-size:16px;font-weight:800">${t('form_t')}</h2>
        <div class="row">
          <div class="field"><label for="n-name">${t('n_name')}</label><input id="n-name" required maxlength="200" autocomplete="off" aria-describedby="e-n-name"><span class="err" id="e-n-name"></span></div>
          <div class="field"><label for="n-source">${t('n_source')}</label><select id="n-source">${['telephone', 'whatsapp', 'email', 'agence'].map(s => `<option value="${s}">${t('src_' + s)}</option>`).join('')}</select></div>
        </div>
        <div class="row">
          <div class="field"><label for="n-phone">${t('n_phone')}</label><input id="n-phone" type="tel" maxlength="50" autocomplete="off" aria-describedby="e-n-contact"></div>
          <div class="field"><label for="n-email">${t('n_email')}</label><input id="n-email" type="email" maxlength="200" autocomplete="off" aria-describedby="e-n-contact"></div>
        </div>
        <span class="err" id="e-n-contact" role="alert"></span>
        <div class="row">
          <div class="field"><label for="n-offer">${t('n_offer')}</label><select id="n-offer"><option value="">${t('custom_trip')}</option>
            ${TC.state.offers.map(o => `<option value="${U.esc(o.slug)}">${U.esc(o.title)}</option>`).join('')}</select></div>
          <div class="field"><label for="n-date">${t('n_date')}</label><input id="n-date" type="date"></div>
          <div class="field"><label for="n-people">${t('n_people')}</label><input id="n-people" type="number" min="1" max="99" value="2" inputmode="numeric"></div>
        </div>
        <div class="row">
          <div class="field"><label for="n-lang">${t('n_lang')}</label><select id="n-lang">${Object.entries(TC.LANGS).map(([k, v]) => `<option value="${k}" ${k === 'en' ? 'selected' : ''}>${U.esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label for="n-hotel">${t('n_hotel')}</label><input id="n-hotel" maxlength="200"></div>
        </div>
        <div class="field"><label for="n-msg">${t('n_msg')}</label><textarea id="n-msg" maxlength="2000"></textarea></div>
        <span class="err" id="e-n-form" role="alert"></span>
        <div><button class="btn" type="submit">${t('n_create')}</button></div>
      </form>`),
    bind: () => {
      const f = U.$('#newForm');
      const pre = TC.state.prefill; TC.state.prefill = null;
      if (pre) { applyParsed(pre); U.$('#n-name').focus(); } else U.$('#paste').focus();
      U.$('#pasteFill').addEventListener('click', () => {
        const raw = U.$('#paste').value.trim(); if (!raw) { U.$('#paste').focus(); return; }
        applyParsed(Object.assign(TC.parseEmail(raw), { source: 'email' })); U.$('#n-name').focus();
      });
      U.$('#pasteClear').addEventListener('click', () => {
        U.$('#paste').value = ''; f.reset(); U.$$('.autof').forEach(el => el.classList.remove('autof')); U.$$('.autotag').forEach(el => el.remove());
        U.$('#paste-ok').hidden = true; U.$('#paste').focus();
      });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const name = U.$('#n-name').value.trim(), phone = U.$('#n-phone').value.trim(), email = U.$('#n-email').value.trim().toLowerCase();
        const set = (id, msg, inputs) => { U.$('#' + id).textContent = msg; inputs.forEach(i => U.$('#' + i).setAttribute('aria-invalid', msg ? 'true' : 'false')); return !msg; };
        let ok = set('e-n-name', name ? '' : t('e_name'), ['n-name']);
        ok = set('e-n-contact', !phone && !email ? t('e_contact') : (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t('e_email') : ''), ['n-phone', 'n-email']) && ok;
        if (!ok) { f.querySelector('[aria-invalid="true"]').focus(); return; }
        const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = t('n_creating');
        const offer = U.$('#n-offer').value, lang = U.$('#n-lang').value;
        const people = Math.min(99, Math.max(1, Math.round(Number(U.$('#n-people').value) || 1)));
        try {
          const row = await TC.api.createRequest({
            first_name: name, phone: phone || null, email: email || null, source: U.$('#n-source').value,
            offer_slug: offer || 'sur-mesure', date_from: U.$('#n-date').value || null, travelers: people,
            language: lang, preferred_language: lang, hotel: U.$('#n-hotel').value.trim() || null,
            message: U.$('#n-msg').value.trim() || null, status: 'new', interests: []
          });
          if (pre && pre.emailId) { try { await TC.api.updateEmail(pre.emailId, { request_id: row.id, status: 'done' }); TC.refreshEmailCount(); } catch { /* le lien e-mail ↔ demande pourra être refait depuis E-mails */ } }
          location.hash = '#/dossier/' + row.id;
        } catch (err) {
          btn.disabled = false; btn.textContent = t('n_create');
          U.$('#e-n-form').textContent = t('save_err', { msg: U.errMsg(err) });
        }
      });
    }
  };
})(window.TC);
