/* Tableau de bord : tout est CALCULÉ à partir des vraies données (demandes, prestations, paiements).
   Jamais de chiffre inventé : sans données, on affiche un état vide ; sans planning, « disponible avec le planning ». */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  let S = null;

  // Mois en cours, heure de Rome
  const romeYM = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit' }).format(new Date(d));

  TC.views.tableau = {
    compute: (reqs, items, pays) => {
      const nowYM = romeYM(Date.now());
      const total = {}, paid = {};
      items.forEach(i => (total[i.request_id] = (total[i.request_id] || 0) + i.amount_cents));
      pays.forEach(p => { if (p.request_id) paid[p.request_id] = (paid[p.request_id] || 0) + p.amount_cents; });
      const confirmed = reqs.filter(r => r.status === 'won' || r.status === 'done');
      const news = reqs.filter(r => r.status === 'new');
      const late = news.filter(r => U.hoursSince(r.created_at) > 12);
      const staleQuotes = reqs.filter(r => r.status === 'sent' && U.hoursSince(r.updated_at) > 48);
      const toCollect = confirmed.map(r => ({ r, left: Math.max(0, (total[r.id] || 0) - (paid[r.id] || 0)) })).filter(x => x.left > 0);
      const since30 = Date.now() - 30 * 864e5;
      const bySource = {};
      reqs.filter(r => new Date(r.created_at).getTime() >= since30).forEach(r => (bySource[r.source] = (bySource[r.source] || 0) + 1));
      return {
        newCount: news.length, lateCount: late.length,
        confirmedMonth: confirmed.filter(r => r.confirmed_at && romeYM(r.confirmed_at) === nowYM).length,
        cashedMonth: pays.filter(p => p.paid_on && p.paid_on.slice(0, 7) === nowYM).reduce((s, p) => s + p.amount_cents, 0),
        leftTotal: toCollect.reduce((s, x) => s + x.left, 0),
        todo: [
          ...late.map(r => ({ r, txt: t('todo_late', { h: Math.floor(U.hoursSince(r.created_at)) }), w: 0 })),
          ...staleQuotes.map(r => ({ r, txt: t('todo_quote', { d: Math.floor(U.hoursSince(r.updated_at) / 24) }), w: 1 })),
          ...toCollect.map(x => ({ r: x.r, txt: t('todo_pay', { x: U.eur(x.left) }), w: 2 }))
        ].sort((a, b) => a.w - b.w || new Date(a.r.created_at) - new Date(b.r.created_at)),
        sources: Object.entries(bySource).sort((a, b) => b[1] - a[1]),
        empty: reqs.length === 0
      };
    },
    load: async () => {
      const [reqs, items, pays] = await Promise.all([TC.api.listRequests(), TC.api.allItems(), TC.api.allPayments()]);
      TC.state.requests = reqs;
      S = TC.views.tableau.compute(reqs, items, pays);
    },
    html: () => {
      const me = TC.state.me, first = (me.full_name || '').split(' ')[0];
      const today = new Date().toLocaleDateString(TC.locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
      const todoN = S.newCount + S.todo.filter(x => x.w > 0).length;
      const maxSrc = Math.max(1, ...S.sources.map(s => s[1]));
      const kpi = (id, label, value, sub, cls = '') => `<div class="card pad kpi" id="${id}"><span class="lbl">${label}</span><strong class="${cls}">${value}</strong><span class="sub">${sub}</span></div>`;
      return U.shell('tableau', `
        <div class="page-head"><div><h1>${U.esc(t('dash_hi', { name: first }))}</h1>
          <p class="sub" style="text-transform:capitalize">${U.esc(today)}</p>
          <p class="sub">${todoN ? t('dash_sum', { n: todoN }) : t('dash_sum0')}</p></div>
          <a class="btn" href="#/nouvelle">${t('nav_new')}</a></div>

        ${S.empty ? `<p class="empty" style="margin-bottom:16px">${t('none_at_all')}</p>` : ''}
        <div class="kpis">
          ${kpi('k-new', t('k_new'), S.newCount, S.lateCount ? `<span style="color:var(--late);font-weight:700">${t('k_new_late', { n: S.lateCount })}</span>` : t('k_new_ok'))}
          ${kpi('k-conf', t('k_conf'), S.confirmedMonth, '')}
          ${kpi('k-ca', t('k_ca'), U.eur(S.cashedMonth), t('k_ca_sub', { x: U.eur(S.leftTotal) }))}
          ${kpi('k-seats', t('k_seats'), '—', t('k_seats_na'), 'muted')}
        </div>

        <div class="grid2" style="margin-top:16px">
          <section class="card pad sec" aria-labelledby="h-todo"><h2 id="h-todo">${t('todo_t')}</h2>
            ${S.todo.length ? `<ul class="todo">${S.todo.slice(0, 15).map(x => `<li><a href="#/dossier/${x.r.id}"><strong>${U.esc(U.name(x.r))}</strong> · ${U.esc(U.offerLabel(x.r))}</a><span class="${x.w === 0 ? 'late' : ''}">${U.esc(x.txt)}</span></li>`).join('')}</ul>`
              : `<p class="sub">${t('todo_none')}</p>`}
          </section>
          <div class="stack">
            <section class="card pad sec" aria-labelledby="h-today"><h2 id="h-today">${t('today_t')}</h2><p class="sub" style="margin:0">${t('today_na')}</p></section>
            <section class="card pad sec" aria-labelledby="h-src"><h2 id="h-src">${t('src_t')}</h2>
              ${S.sources.length ? `<ul class="bars">${S.sources.map(([k, n]) => `<li><span>${U.esc(t('src_' + k))}</span><span class="track" aria-hidden="true"><i style="width:${Math.round(n * 100 / maxSrc)}%"></i></span><strong>${n}</strong></li>`).join('')}</ul>`
                : `<p class="sub" style="margin:0">${t('src_none')}</p>`}
            </section>
          </div>
        </div>`);
    }
  };
})(window.TC);
