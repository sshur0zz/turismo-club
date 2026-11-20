/* Écrans hors application : connexion, accès refusé, guide (bientôt), changement de mot de passe */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  TC.views.login = {
    html: (msg) => `<div class="login"><div class="card">
      <div class="brand" style="padding:0">${U.logo()}<span class="tag">${t('tag')}</span></div>
      <h1 style="font-size:22px">${t('login_t')}</h1>
      ${msg ? `<p class="alert bad" role="alert">${U.esc(msg)}</p>` : ''}
      <form id="loginForm" novalidate style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label for="lg-email">${t('email')}</label>
          <input id="lg-email" type="email" autocomplete="username" required aria-describedby="lg-err"></div>
        <div class="field"><label for="lg-pass">${t('password')}</label>
          <input id="lg-pass" type="password" autocomplete="current-password" required aria-describedby="lg-err"></div>
        <span class="err" id="lg-err" role="alert"></span>
        <button class="btn" type="submit">${t('login_pw_b')}</button>
      </form>
      <details><summary style="cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center">${t('login_link_alt')}</summary>
        <form id="linkForm" novalidate style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
          <p class="sub" style="margin:0">${t('login_d')}</p>
          <div class="field"><label for="lk-email">${t('email')}</label><input id="lk-email" type="email" autocomplete="email" aria-describedby="lk-err"><span class="err" id="lk-err" role="alert"></span></div>
          <button class="btn ghost" type="submit">${t('login_b')}</button>
        </form>
        <p class="alert good" id="lk-ok" role="status" hidden>${t('login_sent')}</p>
      </details>
    </div></div>`,
    bind: () => {
      const f = U.$('#loginForm');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const em = U.$('#lg-email'), pw = U.$('#lg-pass'), err = U.$('#lg-err'), btn = f.querySelector('button');
        const email = em.value.trim().toLowerCase();
        if (!validEmail(email)) { err.textContent = t('login_bad_email'); em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
        if (!pw.value) { err.textContent = t('login_no_pw'); pw.setAttribute('aria-invalid', 'true'); pw.focus(); return; }
        err.textContent = ''; btn.disabled = true; btn.textContent = t('login_sending');
        const { error } = await TC.api.signInPassword(email, pw.value);
        if (error) {
          btn.disabled = false; btn.textContent = t('login_pw_b');
          err.textContent = /rate|too many/i.test(error.message) ? t('login_rate') : t('login_wrong');
          pw.value = ''; pw.focus(); return;
        }
        location.replace(location.pathname);
      });
      const lf = U.$('#linkForm');
      lf.addEventListener('submit', async e => {
        e.preventDefault();
        const inp = U.$('#lk-email'), err = U.$('#lk-err'), btn = lf.querySelector('button');
        const email = inp.value.trim().toLowerCase();
        if (!validEmail(email)) { err.textContent = t('login_bad_email'); inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
        err.textContent = ''; btn.disabled = true; btn.textContent = t('login_sending');
        const { error } = await TC.api.sendMagicLink(email);
        btn.disabled = false; btn.textContent = t('login_b');
        // Même message que l'adresse existe ou non : on ne révèle pas qui fait partie de l'équipe.
        if (error && !/signups not allowed|not found|otp_disabled/i.test(error.message)) { err.textContent = t('login_err'); return; }
        lf.hidden = true; U.$('#lk-ok').hidden = false;
      });
    }
  };

  TC.views.denied = {
    html: (email, title, text) => `<div class="login"><div class="card">
      <div class="brand" style="padding:0">${U.logo()}<span class="tag">${t('tag')}</span></div>
      <h1 style="font-size:22px">${title || t('denied_t')}</h1>
      <p class="sub" style="margin:0">${text || t('denied_d', { email: U.esc(email) })}</p>
      <button type="button" class="btn ghost" id="logout">${t('logout')}</button>
    </div></div>`
  };

  // Changer son mot de passe (depuis le menu)
  TC.views.motdepasse = {
    html: () => U.shell('motdepasse', `
      <div class="page-head"><div><h1>${t('pw_t')}</h1><p class="sub">${t('pw_d')}</p></div></div>
      <form id="pwForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px;max-width:480px">
        <input type="email" autocomplete="username" value="${U.esc(TC.state.me.email)}" hidden aria-hidden="true" tabindex="-1">
        <div class="field"><label for="pw1">${t('pw_new')}</label><input id="pw1" type="password" autocomplete="new-password" minlength="12" required aria-describedby="pw-err pw-hint"><span id="pw-hint" class="sub" style="font-size:13px">${t('pw_hint')}</span></div>
        <div class="field"><label for="pw2">${t('pw_again')}</label><input id="pw2" type="password" autocomplete="new-password" required aria-describedby="pw-err"></div>
        <span class="err" id="pw-err" role="alert"></span>
        <div><button class="btn" type="submit">${t('pw_save')}</button></div>
      </form>`),
    bind: () => {
      const f = U.$('#pwForm');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const a = U.$('#pw1').value, b = U.$('#pw2').value, err = U.$('#pw-err');
        if (a.length < 12) { err.textContent = t('pw_short'); U.$('#pw1').focus(); return; }
        if (a !== b) { err.textContent = t('pw_mismatch'); U.$('#pw2').focus(); return; }
        const btn = f.querySelector('button'); btn.disabled = true;
        const { error } = await TC.api.sb.auth.updateUser({ password: a });
        btn.disabled = false;
        if (error) { err.textContent = t('save_err', { msg: error.message }); return; }
        f.reset(); err.textContent = ''; U.toast(t('pw_ok'));
      });
    }
  };
})(window.TC);
