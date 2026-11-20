/* Rubriques prévues (phases B et C) : présentées dans le menu avec la mention « Bientôt ».
   Aucune donnée affichée : seulement ce que la rubrique permettra de faire. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};

  TC.SOON = {
    tableau: { title: 'soon_dash_t', items: ['soon_dash_1', 'soon_dash_2', 'soon_dash_3', 'soon_dash_4'] },
    planning: { title: 'soon_plan_t', items: ['soon_plan_1', 'soon_plan_2', 'soon_plan_3', 'soon_plan_4'] },
    guides: { title: 'soon_guides_t', items: ['soon_guides_1', 'soon_guides_2', 'soon_guides_3'] },
    vueguide: { title: 'soon_vg_t', items: ['soon_vg_1', 'soon_vg_2', 'soon_vg_3'] },
    paiement: { title: 'soon_pay_t', items: ['soon_pay_1', 'soon_pay_2', 'soon_pay_3'] }
  };

  TC.views.bientot = {
    key: 'tableau',
    load: async params => { TC.views.bientot.key = TC.SOON[params[0]] ? params[0] : 'tableau'; },
    html: () => {
      const k = TC.views.bientot.key, s = TC.SOON[k];
      return U.shell('bientot/' + k, `
        <div class="page-head"><div><h1 style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">${t(s.title)} <span class="badge st-sent">${t('soon')}</span></h1>
          <p class="sub">${t('soon_d')}</p></div></div>
        <section class="card pad" style="max-width:760px" aria-labelledby="soon-h">
          <h2 id="soon-h" style="font-size:16px;font-weight:800;margin-bottom:12px">${t('soon_what')}</h2>
          <ul style="margin:0;padding-left:20px;line-height:1.9">${s.items.map(i => `<li>${t(i)}</li>`).join('')}</ul>
        </section>
        <p class="sub" style="margin-top:16px"><a href="#/demandes">${t('soon_back')}</a></p>`);
    }
  };
})(window.TC);
