/* Écrans hors application : connexion, accès refusé, guide (bientôt), changement de mot de passe */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  TC.views.login = {
    html: (msg) => `<div class="login"><div class="card">
      <div class="brand" style="padding:0">${U.logo()}<span class="tag">${t('tag')}</span></div>
      <div style="display:flex;justify-content:flex-end">${U.langSwitch()}</div>
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

  // Code de l'application d'authentification (après le mot de passe)
  TC.views.mfa = {
    html: () => `<div class="login"><div class="card">
      <div class="brand" style="padding:0">${U.logo()}<span class="tag">${t('tag')}</span></div>
      <h1 style="font-size:22px">${t('mfa_t')}</h1>
      <p class="sub" style="margin:0">${t('mfa_d')}</p>
      <form id="mfaForm" novalidate style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label for="mfa-code">${t('mfa_code')}</label>
          <input id="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required aria-describedby="mfa-err"></div>
        <span class="err" id="mfa-err" role="alert"></span>
        <button class="btn" type="submit">${t('mfa_b')}</button>
      </form>
      <button type="button" class="btn ghost" id="logout">${t('logout')}</button>
    </div></div>`,
    bind: () => {
      const f = U.$('#mfaForm'); U.$('#mfa-code').focus();
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const code = U.$('#mfa-code').value.replace(/\s/g, ''), err = U.$('#mfa-err'), btn = f.querySelector('button');
        if (!/^[0-9]{6}$/.test(code)) { err.textContent = t('mfa_bad'); U.$('#mfa-code').focus(); return; }
        btn.disabled = true;
        const { data } = await TC.api.sb.auth.mfa.listFactors();
        const factor = data && data.totp && data.totp.find(x => x.status === 'verified');
        const { error } = factor ? await TC.api.sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code }) : { error: new Error('no factor') };
        btn.disabled = false;
        if (error) { err.textContent = t('mfa_wrong'); U.$('#mfa-code').value = ''; U.$('#mfa-code').focus(); return; }
        location.replace(location.pathname + location.hash);
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
      ${TC.state.forcePw ? `<p class="alert bad" role="alert">${t('pw_force')}</p>` : ''}
      <form id="pwForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:14px;max-width:480px">
        <input type="email" autocomplete="username" value="${U.esc(TC.state.me.email)}" hidden aria-hidden="true" tabindex="-1">
        <div class="field"><label for="pw1">${t('pw_new')}</label><input id="pw1" type="password" autocomplete="new-password" minlength="12" required aria-describedby="pw-err pw-hint"><span id="pw-hint" class="sub" style="font-size:13px">${t('pw_hint')}</span></div>
        <div class="field"><label for="pw2">${t('pw_again')}</label><input id="pw2" type="password" autocomplete="new-password" required aria-describedby="pw-err"></div>
        <span class="err" id="pw-err" role="alert"></span>
        <div><button class="btn" type="submit">${t('pw_save')}</button></div>
      </form>
      <section class="card pad" aria-labelledby="mfa-h" style="display:flex;flex-direction:column;gap:12px;max-width:480px;margin-top:16px">
        <h2 id="mfa-h" style="font-size:16px;font-weight:800">${t('mfa_sec_t')}</h2>
        <p class="sub" style="margin:0">${t('mfa_sec_d')}</p>
        <div id="mfa-zone" aria-live="polite"><p class="sub" style="margin:0">${t('loading')}</p></div>
      </section>`),
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
        if (TC.state.forcePw) { await TC.api.sb.auth.updateUser({ data: { must_change_password: false } }); TC.state.forcePw = false; }
      });
      mfaZone();
    }
  };

  // Activer / désactiver la double authentification (code d'application, gratuit dans Supabase Auth)
  async function mfaZone() {
    const z = U.$('#mfa-zone'); if (!z) return;
    const mfa = TC.api.sb.auth.mfa;
    const { data, error } = await mfa.listFactors();
    if (!z.isConnected) return;   // la page a été redessinée entre-temps
    if (error) { z.innerHTML = `<p class="alert bad" role="alert">${U.esc(t('save_err', { msg: error.message }))}</p>`; return; }
    const on = data.totp.find(x => x.status === 'verified');
    if (on) {
      z.innerHTML = `<p class="alert good" role="status" style="margin:0 0 10px">${t('mfa_on')}</p><button type="button" class="btn ghost" id="mfa-off">${t('mfa_off_b')}</button>`;
      z.querySelector('#mfa-off').addEventListener('click', async () => {
        if (!confirm(t('mfa_off_confirm'))) return;
        const { error: e2 } = await mfa.unenroll({ factorId: on.id });
        if (e2) { U.toast(t('save_err', { msg: e2.message })); return; }
        U.toast(t('mfa_off_ok')); mfaZone();
      });
      return;
    }
    z.innerHTML = `<button type="button" class="btn" id="mfa-start">${t('mfa_on_b')}</button>`;
    z.querySelector('#mfa-start').addEventListener('click', async () => {
      for (const old of data.all.filter(x => x.status !== 'verified')) await mfa.unenroll({ factorId: old.id }); // essais abandonnés
      const { data: en, error: e1 } = await mfa.enroll({ factorType: 'totp', friendlyName: 'Turismo Club' });
      if (e1) { z.innerHTML = `<p class="alert bad" role="alert">${U.esc(t('save_err', { msg: e1.message }))}</p>`; return; }
      z.innerHTML = `<ol style="margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>${t('mfa_step1')}</li><li>${t('mfa_step2')}</li></ol>
        <img src="${U.esc(en.totp.qr_code)}" alt="${U.esc(t('mfa_qr_alt'))}" width="180" height="180" style="background:#fff;border:1px solid var(--line);border-radius:8px">
        <p class="sub" style="margin:8px 0 12px;word-break:break-all">${t('mfa_secret')} <code>${U.esc(en.totp.secret)}</code></p>
        <form id="mfaEnroll" novalidate style="display:flex;flex-direction:column;gap:10px">
          <div class="field"><label for="mfa-new">${t('mfa_code')}</label><input id="mfa-new" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required aria-describedby="mfa-new-err"></div>
          <span class="err" id="mfa-new-err" role="alert"></span>
          <div><button class="btn" type="submit">${t('mfa_confirm_b')}</button></div>
        </form>`;
      U.$('#mfaEnroll').addEventListener('submit', async e => {
        e.preventDefault();
        const code = U.$('#mfa-new').value.replace(/\s/g, ''), er = U.$('#mfa-new-err');
        if (!/^[0-9]{6}$/.test(code)) { er.textContent = t('mfa_bad'); return; }
        const { error: e3 } = await mfa.challengeAndVerify({ factorId: en.id, code });
        if (e3) { er.textContent = t('mfa_wrong'); return; }
        U.toast(t('mfa_on_ok')); mfaZone();
      });
    });
  }
})(window.TC);
