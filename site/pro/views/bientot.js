/* Rubriques prévues (phases B et C) : présentées dans le menu avec la mention « Bientôt ».
   Aucune donnée affichée : seulement ce que la rubrique permettra de faire. */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};

  TC.SOON = {
    paiement: { title: 'soon_pay_t', items: ['soon_pay_1', 'soon_pay_2', 'soon_pay_3'] }
  };

  TC.views.bientot = {
    key: 'paiement',
    load: async params => { TC.views.bientot.key = TC.SOON[params[0]] ? params[0] : 'paiement'; },
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
