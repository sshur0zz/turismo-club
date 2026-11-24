/* Fiche d'une demande / réservation */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  let D = null;          // dossier affiché
  let editing = null;    // id de la prestation en cours de modification
  let past = 0;

  const totals = () => {
    const total = D.items.reduce((s, i) => s + i.amount_cents, 0);
    const paid = D.payments.reduce((s, p) => s + p.amount_cents, 0);
    return { total, paid, left: Math.max(0, total - paid), pct: total > 0 ? Math.min(100, Math.round(paid * 100 / total)) : 0 };
  };
  const clientLang = () => D.preferred_language || D.language || 'en';
  const phoneDigits = () => String(D.phone || (D.customer && D.customer.phone) || '').replace(/[^0-9]/g, '').replace(/^00/, '');
  const email = () => D.email || (D.customer && D.customer.email) || '';

  function recapText() {
    const l = clientLang(), tt = totals();
    const loc = { en: 'en-GB', it: 'it-IT', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', pt: 'pt-PT', nl: 'nl-NL', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[l] || 'en-GB';
    const eur = c => new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' }).format(c / 100);
    const dt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'long' }) : '';
    const lines = D.items.map(i => `• ${i.label}${i.service_date ? ' · ' + dt(i.service_date) : ''}${i.service_time ? ' ' + i.service_time : ''} · ${i.people} ${TC.ct(l, 'people')} · ${eur(i.amount_cents)}`);
    return [TC.ct(l, 'hi', { name: D.first_name, ref: D.reference }), '', TC.ct(l, 'recap', { ref: D.reference }), ...lines, '',
      `${TC.ct(l, 'total')} : ${eur(tt.total)}`, `${TC.ct(l, 'paid')} : ${eur(tt.paid)}`, `${TC.ct(l, 'left')} : ${eur(tt.left)}`, '', TC.ct(l, 'thanks')].join('\n');
  }
  const waUrl = text => `https://wa.me/${phoneDigits()}?text=${encodeURIComponent(text)}`;

  function itemForm() {
    const it = editing ? D.items.find(i => i.id === editing) : null;
    const offers = TC.state.offers;
    return `<form id="itemForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px;margin-top:12px;background:var(--bg)">
      <h3 style="font-size:14px">${it ? t('it_form_edit') : t('it_form')}</h3>
      <div class="row">
        <div class="field"><label for="it-offer">${t('it_offer')}</label><select id="it-offer"><option value="">${t('it_other')}</option>
          ${offers.map(o => `<option value="${o.id}" data-price="${o.price_adult_cents}" ${it && it.activity_id === o.id ? 'selected' : ''}>${U.esc(o.title)}</option>`).join('')}</select></div>
        <div class="field"><label for="it-label">${t('it_label')}</label><input id="it-label" value="${U.esc(it ? it.label : '')}" maxlength="200" required aria-describedby="e-it-label"><span class="err" id="e-it-label"></span></div>
      </div>
      <div class="row">
        <div class="field"><label for="it-date">${t('it_date')}</label><input id="it-date" type="date" value="${it && it.service_date ? it.service_date : ''}"></div>
        <div class="field"><label for="it-time">${t('it_time')}</label><input id="it-time" type="time" value="${it && it.service_time ? it.service_time : ''}"></div>
        <div class="field"><label for="it-people">${t('it_people')}</label><input id="it-people" type="number" min="1" max="999" inputmode="numeric" value="${it ? it.people : (D.travelers || 1)}" aria-describedby="e-it-people"><span class="err" id="e-it-people"></span></div>
        <div class="field"><label for="it-amount">${t('it_amount')}</label><input id="it-amount" inputmode="decimal" value="${it ? (it.amount_cents / 100).toFixed(2) : ''}" aria-describedby="e-it-amount"><span class="err" id="e-it-amount"></span></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">${it ? t('it_save') : t('it_add')}</button>
        ${it ? `<button class="btn quiet" type="button" id="itCancel">${t('it_cancel')}</button>` : ''}</div>
    </form>`;
  }

  function html() {
    const tt = totals(), isAdmin = TC.state.me.role === 'admin', lang = clientLang();
    const ph = phoneDigits(), em = email();
    return U.shell('demandes', `
      <p style="margin:0 0 10px"><a href="#/demandes">${t('back')}</a></p>
      <div class="page-head" style="align-items:flex-start">
        <div><h1 style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">${U.esc(U.name(D))} ${U.badge(D.status)}</h1>
          <p class="sub">${D.customer ? `<a href="#/clients/${D.customer.id}">${t('client_sheet')}</a> · ` : ''}<strong>${U.esc(D.reference)}</strong> · ${t('source')} : ${U.esc(t('src_' + D.source))} · ${t('lang')} : ${U.esc(U.langName(lang))} · ${t('created')} ${U.dateTime(D.created_at)}</p></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${ph ? `<a class="btn" id="waBtn" href="${U.esc(waUrl(TC.ct(lang, 'hi', { name: D.first_name, ref: D.reference })))}" target="_blank" rel="noopener">${t('wa')}</a>` : `<button class="btn" disabled>${t('wa')} · ${t('no_phone')}</button>`}
          ${em ? `<a class="btn ghost" id="mailBtn" href="mailto:${U.esc(em)}?subject=${encodeURIComponent('Turismo Club — ' + D.reference)}">${t('mail')}</a>` : `<button class="btn ghost" disabled>${t('mail')} · ${t('no_email')}</button>`}
          <button class="btn ghost" type="button" id="recapBtn">${t('recap_b')}</button>
        </div>
      </div>

      <div class="grid2">
        <div class="stack">
          <section class="card pad sec" aria-labelledby="h-items"><h2 id="h-items">${t('items_t')}</h2>
            ${D.items.length ? `<div class="tscroll"><table class="t"><thead><tr><th>${t('it_offer')}</th><th>${t('it_date')}</th><th>${t('it_people')}</th><th class="num">${t('it_amount')}</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
              ${D.items.map(i => `<tr><td>${U.esc(i.label)}</td><td>${i.service_date ? U.date(i.service_date) : '—'}${i.service_time ? ' · ' + U.esc(i.service_time) : ''}</td><td>${i.people}</td><td class="num">${U.eur(i.amount_cents)}</td>
                <td style="white-space:nowrap"><button type="button" class="linkbtn" data-edit="${i.id}">${t('it_edit')}<span class="sr"> ${U.esc(i.label)}</span></button> <button type="button" class="linkbtn" data-del-item="${i.id}">${t('it_del')}<span class="sr"> ${U.esc(i.label)}</span></button></td></tr>`).join('')}
              </tbody><tfoot><tr><td colspan="3">${t('it_total')}</td><td class="num" id="total">${U.eur(tt.total)}</td><td></td></tr></tfoot></table></div>`
              : `<p class="sub">${t('it_none')}</p>`}
            ${itemForm()}
          </section>
          ${TC.prod ? TC.prod.html(D) : ''}

          <section class="card pad sec" aria-labelledby="h-pay"><h2 id="h-pay">${t('pay_t')}</h2>
            <dl class="kv"><dt>${t('it_total')}</dt><dd>${U.eur(tt.total)}</dd><dt>${t('paid')}</dt><dd id="paid" style="color:var(--ok)">${U.eur(tt.paid)}</dd><dt>${t('remaining')}</dt><dd id="left">${U.eur(tt.left)}</dd></dl>
            <div class="bar" role="progressbar" aria-label="${t('pay_progress', { pct: tt.pct })}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${tt.pct}" style="margin:12px 0"><i style="width:${tt.pct}%"></i></div>
            ${D.payments.length ? `<ul class="timeline" style="margin-bottom:12px">${D.payments.map(p => `<li><strong>${U.eur(p.amount_cents)}</strong> · ${U.esc(t('m_' + (p.method || 'stripe')))} · ${U.date(p.paid_on)}
              ${isAdmin ? ` <button type="button" class="linkbtn" data-del-pay="${p.id}">${t('pay_del')}</button>` : ''}</li>`).join('')}</ul>` : `<p class="sub">${t('pay_none')}</p>`}
            <form id="payForm" novalidate style="display:flex;flex-direction:column;gap:12px">
              <div class="row">
                <div class="field"><label for="pay-amount">${t('pay_amount')}</label><input id="pay-amount" inputmode="decimal" required aria-describedby="e-pay"><span class="err" id="e-pay"></span></div>
                <div class="field"><label for="pay-date">${t('pay_date')}</label><input id="pay-date" type="date" value="${U.todayRome()}" required></div>
                <div class="field"><label for="pay-method">${t('pay_method')}</label><select id="pay-method">${['especes', 'virement', 'carte_sur_place'].map(m => `<option value="${m}">${t('m_' + m)}</option>`).join('')}</select></div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button class="btn" type="submit">${t('pay_add')}</button>
                <button class="btn quiet" type="button" disabled aria-describedby="soon">${t('pay_link')}</button><span id="soon" class="badge src">${t('pay_soon')}</span></div>
            </form>
          </section>

          ${D.message ? `<section class="card pad sec"><h2>${t('msg_t')}</h2><p style="margin:0;white-space:pre-wrap">${U.esc(D.message)}</p></section>` : ''}
        </div>

        <div class="stack">
          <section class="card pad sec" aria-labelledby="h-status"><h2 id="h-status">${t('status_t')}</h2>
            <div class="field"><label for="d-step">${t('step')}</label><select id="d-step">${U.STATUSES.map(s => `<option value="${s}" ${s === D.status ? 'selected' : ''}>${t('st1_' + s)}</option>`).join('')}</select></div>
            ${D.status === 'lost' && D.lost_reason ? `<p class="alert bad" style="margin:10px 0 0"><strong>${t('lost_short')}</strong> ${U.esc(D.lost_reason)}</p>` : ''}
            <div class="field" style="margin-top:12px"><label for="d-owner">${t('owner')}</label><select id="d-owner"><option value="">${t('nobody')}</option>
              ${TC.state.team.map(s => `<option value="${s.id}" ${s.id === D.assigned_staff_id ? 'selected' : ''}>${U.esc(s.full_name)} (${t('role_' + s.role)})</option>`).join('')}</select></div>
          </section>

          <section class="card pad sec" aria-labelledby="h-cust"><h2 id="h-cust">${t('cust_t')}</h2>
            <dl class="kv"><dt>${t('phone')}</dt><dd>${U.esc(D.phone || (D.customer && D.customer.phone) || '—')}</dd>
              <dt>${t('email')}</dt><dd>${U.esc(em || '—')}</dd><dt>${t('past')}</dt><dd id="past">${past}</dd></dl>
            <form id="hotelForm" style="display:flex;gap:8px;align-items:flex-end;margin-top:12px;flex-wrap:wrap">
              <div class="field" style="flex:1 1 160px"><label for="d-hotel">${t('hotel')}</label><input id="d-hotel" value="${U.esc(D.hotel || '')}" maxlength="200"></div>
              <button class="btn quiet" type="submit">${t('hotel_save')}</button></form>
          </section>

          <section class="card pad sec" aria-labelledby="h-note"><h2 id="h-note">${t('note_t')}</h2>
            <form id="noteForm" style="display:flex;flex-direction:column;gap:10px">
              <div class="field"><label for="d-note" class="sr">${t('note_t')}</label><textarea id="d-note" maxlength="4000" aria-describedby="note-d">${U.esc(D.internal_note || '')}</textarea>
                <span id="note-d" class="sub" style="font-size:13px">${t('note_d')}</span></div>
              <button class="btn quiet" type="submit">${t('note_save')}</button></form>
          </section>

          <section class="card pad sec" aria-labelledby="h-hist"><h2 id="h-hist">${t('hist_t')}</h2>
            ${D.events.length ? `<ol class="timeline">${D.events.map(ev => `<li>${U.esc(TC.histMsg(ev.message))}<small>${U.dateTime(ev.created_at)} · ${t('by', { name: U.esc(ev.author ? ev.author.full_name : t('system')) })}</small></li>`).join('')}</ol>` : `<p class="sub">${t('hist_none')}</p>`}
          </section>
        </div>
      </div>

      <dialog id="recapDlg" aria-labelledby="recap-h" style="border:1px solid var(--line);border-radius:14px;max-width:560px;width:calc(100% - 32px);padding:20px">
        <h2 id="recap-h" style="font-size:18px;margin-bottom:12px">${t('recap_t')}</h2>
        <pre class="recap" id="recapText">${U.esc(recapText())}</pre>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
          <button type="button" class="btn" id="copyBtn">${t('copy')}</button>
          ${ph ? `<a class="btn ghost" href="${U.esc(waUrl(recapText()))}" target="_blank" rel="noopener" id="recapWa">${t('send_wa')}</a>` : ''}
          <button type="button" class="btn quiet" id="closeDlg">${t('close')}</button></div>
      </dialog>`);
  }

  async function load(id) {
    const d = await TC.api.getRequest(id);
    if (!d) return null;
    d.items.sort((a, b) => a.id - b.id);
    d.payments.sort((a, b) => (a.paid_on + a.created_at).localeCompare(b.paid_on + b.created_at));
    d.events.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    past = await TC.api.pastBookings(d.customer_id, d.id);
    if (TC.prod) await TC.prod.load(d);
    return d;
  }

  async function act(fn, focusSel) {
    try { await fn(); U.toast(t('saved')); }
    catch (e) { U.toast(t('save_err', { msg: U.errMsg(e) })); }
    D = await load(D.id); TC.render(true);
    if (focusSel) { const el = U.$(focusSel); if (el) el.focus(); }
  }

  TC.views.dossier = {
    load: async params => { editing = null; D = await load(Number(params[0])); return D; },
    html: () => D ? html() : U.shell('demandes', `<p class="empty">${t('not_found')} <a href="#/demandes">${t('back')}</a></p>`),
    current: () => D,
    bind: () => {
      if (!D) return;
      const main = U.$('#main');
      if (TC.prod) TC.prod.bind(D, async () => { D = await load(D.id); TC.render(true); });
      U.$('#d-step').addEventListener('change', async e => {
        const patch = await U.statusPatch(e.target.value);
        if (!patch) { e.target.value = D.status; e.target.focus(); return; }   // motif refusé : rien n'est enregistré
        act(() => TC.api.updateRequest(D.id, patch), '#d-step');
      });
      U.$('#d-owner').addEventListener('change', e => act(() => TC.api.updateRequest(D.id, { assigned_staff_id: e.target.value || null }), '#d-owner'));
      U.$('#hotelForm').addEventListener('submit', e => { e.preventDefault(); act(() => TC.api.updateRequest(D.id, { hotel: U.$('#d-hotel').value.trim() || null }), '#d-hotel'); });
      U.$('#noteForm').addEventListener('submit', e => { e.preventDefault(); act(() => TC.api.updateRequest(D.id, { internal_note: U.$('#d-note').value.trim() || null }), '#d-note'); });

      // Prestations
      const offerSel = U.$('#it-offer');
      offerSel.addEventListener('change', () => {
        const o = TC.state.offers.find(x => String(x.id) === offerSel.value); if (!o) return;
        U.$('#it-label').value = o.title;
        const n = Math.max(1, Number(U.$('#it-people').value) || 1);
        U.$('#it-amount').value = (o.price_adult_cents * n / 100).toFixed(2);
      });
      U.$('#itemForm').addEventListener('submit', e => {
        e.preventDefault();
        const label = U.$('#it-label').value.trim(), people = Math.round(Number(U.$('#it-people').value)), cents = U.cents(U.$('#it-amount').value || '0');
        const errs = { 'it-label': label ? '' : t('e_label'), 'it-people': people >= 1 && people <= 999 ? '' : t('e_people'), 'it-amount': cents >= 0 ? '' : t('e_amount') };
        let first = null;
        for (const [k, m] of Object.entries(errs)) { U.$('#e-' + k).textContent = m; U.$('#' + k).setAttribute('aria-invalid', m ? 'true' : 'false'); if (m && !first) first = k; }
        if (first) { U.$('#' + first).focus(); return; }
        const row = { label, people, amount_cents: cents, activity_id: offerSel.value ? Number(offerSel.value) : null,
          service_date: U.$('#it-date').value || null, service_time: U.$('#it-time').value || null };
        const id = editing; editing = null;
        act(() => id ? TC.api.updateItem(id, row) : TC.api.addItem(Object.assign({ request_id: D.id }, row)), '#it-label');
      });
      main.addEventListener('click', e => {
        const ed = e.target.closest('[data-edit]');
        if (ed) { editing = Number(ed.dataset.edit); TC.render(true); U.$('#it-label').focus(); return; }
        if (e.target.closest('#itCancel')) { editing = null; TC.render(true); return; }
        const del = e.target.closest('[data-del-item], [data-del-pay]');
        if (del) {
          // Double clic de confirmation (pas de fenêtre de confirmation du navigateur)
          if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.dataset.text = del.textContent; del.textContent = t('confirm_del'); setTimeout(() => { if (del.isConnected) { del.dataset.armed = ''; del.textContent = del.dataset.text; } }, 4000); return; }
          if (del.dataset.delItem) act(() => TC.api.deleteItem(Number(del.dataset.delItem)));
          else act(() => TC.api.deletePayment(Number(del.dataset.delPay)));
        }
      });

      // Paiement manuel
      U.$('#payForm').addEventListener('submit', e => {
        e.preventDefault();
        const cents = U.cents(U.$('#pay-amount').value), err = U.$('#e-pay');
        if (!(cents > 0)) { err.textContent = t('e_amount'); U.$('#pay-amount').setAttribute('aria-invalid', 'true'); U.$('#pay-amount').focus(); return; }
        act(() => TC.api.addPayment({ request_id: D.id, amount_cents: cents, method: U.$('#pay-method').value, paid_on: U.$('#pay-date').value || U.todayRome(), provider: 'manuel', created_by: TC.state.me.id }), '#pay-amount');
      });

      // Récapitulatif
      const dlg = U.$('#recapDlg');
      U.$('#recapBtn').addEventListener('click', () => { dlg.showModal(); U.$('#copyBtn').focus(); });
      U.$('#closeDlg').addEventListener('click', () => { dlg.close(); U.$('#recapBtn').focus(); });
      U.$('#copyBtn').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(U.$('#recapText').textContent); U.toast(t('copied')); }
        catch { const r = document.createRange(); r.selectNodeContents(U.$('#recapText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      });
    }
  };
})(window.TC);
