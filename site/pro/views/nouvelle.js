/* Nouvelle demande saisie par l'équipe (téléphone, WhatsApp, e-mail, agence) */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};

  TC.views.nouvelle = {
    html: () => U.shell('demandes', `
      <p style="margin:0 0 10px"><a href="#/demandes">${t('back')}</a></p>
      <div class="page-head"><div><h1>${t('new_t')}</h1><p class="sub">${t('new_d')}</p></div></div>
      <form id="newForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px;max-width:860px">
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
      U.$('#n-name').focus();
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
          location.hash = '#/dossier/' + row.id;
        } catch (err) {
          btn.disabled = false; btn.textContent = t('n_create');
          U.$('#e-n-form').textContent = t('save_err', { msg: U.errMsg(err) });
        }
      });
    }
  };
})(window.TC);
