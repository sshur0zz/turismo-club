/* Vue guide (téléphone) : Ma journée (pointage), Semaine, Disponibilités.
   Données via guide_departures() : uniquement SES départs, participants sans montants ni coordonnées. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const V = { tab: 'jour', deps: [], avail: [] };

  const mapUrl = d => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.meeting_lat && d.meeting_lng ? `${d.meeting_lat},${d.meeting_lng}` : `${d.meeting_point}, Roma`);
  const arrived = d => d.participants.filter(p => p.checked).reduce((s, p) => s + p.people, 0);
  const expected = d => d.participants.reduce((s, p) => s + p.people, 0);

  function depCard(d, withCheckin) {
    const notes = d.participants.filter(p => p.note).map(p => `${U.esc(p.name)} : ${U.esc(p.note)}`);
    if (d.note) notes.unshift(U.esc(d.note));
    return `<article class="card pad vgcard" data-vdep="${d.departure_id}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap">
        <h2 style="font-size:18px"><span style="color:var(--accent)">${U.romeTime(d.starts_at)}</span> ${U.esc(d.activity)}</h2>
        <span class="badge ${d.tickets_status === 'achetes' ? 'st-won' : d.tickets_status === 'a_acheter' ? 'st-in_progress' : 'src'}">${t('dp_tickets')} : ${t('tk_' + d.tickets_status)}</span></div>
      <p class="sub" style="margin:6px 0 0">${t('lang')} : ${U.esc(U.langName(d.language))}</p>
      <p style="margin:8px 0 0"><strong>${t('vg_meet')} :</strong> ${U.esc(d.meeting_point || '—')}<br><a href="${U.esc(mapUrl(d))}" target="_blank" rel="noopener" class="btn ghost small" style="margin-top:8px">${t('vg_map')}</a></p>
      ${withCheckin ? `<p class="arrived" aria-live="polite">${t('vg_arrived', { a: arrived(d), n: expected(d) })}</p>` : `<p class="sub" style="margin:8px 0 0">${t('vg_people', { n: expected(d) })}</p>`}
      ${withCheckin ? (d.participants.length ? `<ul class="plist">${d.participants.map(p => `<li class="pcheck">
          <button type="button" class="chk" data-ck="${p.kind}:${p.id}" aria-pressed="${p.checked}" aria-label="${t('vg_check')} : ${U.esc(p.name)}">${p.checked ? '✓' : ''}</button>
          <span><strong>${U.esc(p.name)}</strong> · ${t('vg_people', { n: p.people })} · ${U.esc(U.langName(p.language))}</span></li>`).join('')}</ul>` : `<p class="sub">${t('dp_none')}</p>`) : ''}
      ${notes.length ? `<div class="notes"><strong>${t('vg_notes')}</strong><ul>${notes.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
    </article>`;
  }

  function content() {
    const today = U.todayRome();
    if (V.tab === 'jour') {
      const list = V.deps.filter(d => U.romeDay(d.starts_at) === today);
      return `<h1 style="font-size:22px;margin-bottom:4px">${t('vg_hi')}</h1><p class="sub" style="margin:0 0 14px;text-transform:capitalize">${U.esc(new Date().toLocaleDateString(TC.locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }))}</p>
        ${list.length ? list.map(d => depCard(d, true)).join('') : `<p class="empty">${t('vg_none_today')}</p>`}`;
    }
    if (V.tab === 'semaine') {
      const days = [...Array(7)].map((_, i) => U.addDays(today, i));
      const any = V.deps.length;
      return `<h1 style="font-size:22px;margin-bottom:14px">${t('vg_week')}</h1>${any ? days.map(day => {
        const list = V.deps.filter(d => U.romeDay(d.starts_at) === day);
        return list.length ? `<h2 class="vgday">${U.esc(U.dayLabel(day))}</h2>${list.map(d => depCard(d, false)).join('')}` : '';
      }).join('') : `<p class="empty">${t('vg_none_week')}</p>`}`;
    }
    const days = [...Array(30)].map((_, i) => U.addDays(today, i));
    return `<h1 style="font-size:22px;margin-bottom:4px">${t('vg_avail')}</h1><p class="sub" style="margin:0 0 14px">${t('vg_avail_d')}</p>
      <ul class="avail">${days.map(day => {
        const a = V.avail.find(x => x.day === day), v = a ? (a.available ? 'free' : 'busy') : 'unset';
        return `<li><span>${U.esc(U.dayLabel(day))}</span><span role="group" aria-label="${U.esc(U.dayLabel(day))}" class="seg">
          ${[['free', t('vg_free')], ['busy', t('vg_busy')], ['unset', t('vg_unset')]].map(([k, l]) => `<button type="button" data-av="${day}:${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</span></li>`;
      }).join('')}</ul>`;
  }

  TC.views.vueguide = {
    load: async params => {
      V.tab = ['jour', 'semaine', 'dispo'].includes(params[0]) ? params[0] : 'jour';
      const today = U.todayRome();
      if (!TC.state.me.guide_id) { V.deps = []; V.avail = []; return; }
      if (V.tab === 'dispo') V.avail = await TC.api.availability(today, U.addDays(today, 29));
      else V.deps = await TC.api.myDepartures(today, U.addDays(today, V.tab === 'jour' ? 0 : 6));
    },
    html: () => {
      const me = TC.state.me;
      return `<div class="vg">
        <header class="vghead"><a class="brand" href="#/jour" style="flex-direction:row;align-items:center;gap:8px">${U.logo()}</a>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end"><span class="sub" style="font-size:13px">${U.esc(me.full_name)}</span>${U.langSwitch()}<button type="button" class="btn quiet small" id="logout">${t('logout')}</button></div></header>
        <main id="main" tabindex="-1" class="vgmain">${me.guide_id ? content() : `<p class="alert bad">${t('vg_no_guide_link')}</p>`}</main>
        <nav class="vgtabs" aria-label="Menu">${[['jour', t('vg_today')], ['semaine', t('vg_week')], ['dispo', t('vg_avail')]].map(([k, l]) => `<a href="#/${k}" ${V.tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      </div>`;
    },
    bind: () => {
      U.$('#main').addEventListener('click', async e => {
        const ck = e.target.closest('[data-ck]');
        if (ck) {
          const [kind, id] = ck.dataset.ck.split(':'), now = ck.getAttribute('aria-pressed') !== 'true';
          ck.disabled = true;
          try {
            await TC.api.checkin(kind, Number(id), now);
            V.deps.forEach(d => d.participants.forEach(p => { if (p.kind === kind && p.id === Number(id)) p.checked = now; }));
            TC.render(true); const again = U.$(`[data-ck="${kind}:${id}"]`); if (again) again.focus();
          } catch (err) { ck.disabled = false; U.toast(t('save_err', { msg: U.errMsg(err) })); }
          return;
        }
        const av = e.target.closest('[data-av]');
        if (av) {
          const [day, k] = av.dataset.av.split(':');
          try {
            await TC.api.setAvailability(TC.state.me.guide_id, day, k === 'unset' ? null : k === 'free');
            V.avail = V.avail.filter(x => x.day !== day); if (k !== 'unset') V.avail.push({ day, available: k === 'free' });
            TC.render(true); const again = U.$(`[data-av="${day}:${k}"]`); if (again) again.focus();
          } catch (err) { U.toast(t('save_err', { msg: U.errMsg(err) })); }
        }
      });
    }
  };
})(window.TC);
