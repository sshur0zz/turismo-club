/* Bibliothèque d'icônes (équipements et services).
   En base on stocke UNIQUEMENT le code stable (ex. « wifi ») : le dessin et les libellés vivent ici et peuvent changer sans migration.
   Portées : hotel (hôtels et chambres), vehicle (flotte), service (prestations), common (partout).
   Dessins originaux, trait 24 × 24, couleur du texte (currentColor). */
window.TC = window.TC || {};
(function (TC) {
  const P = (d) => d; // chemins SVG
  const ICONS = {
    // ---- communs / hôtel ----
    wifi:            { s: ['hotel', 'vehicle', 'common'], fr: 'Wi-Fi', it: 'Wi-Fi', d: P('M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01') },
    air_conditioning:{ s: ['hotel', 'vehicle', 'common'], fr: 'Climatisation', it: 'Aria condizionata', d: P('M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9M9 3l3 3 3-3M9 21l3-3 3 3') },
    parking:         { s: ['hotel'], fr: 'Parking', it: 'Parcheggio', d: P('M4 3h16v18H4zM9 17V7h4a3 3 0 0 1 0 6H9') },
    pool:            { s: ['hotel'], fr: 'Piscine', it: 'Piscina', d: P('M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5M2 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 9h8') },
    breakfast:       { s: ['hotel', 'service'], fr: 'Petit-déjeuner', it: 'Colazione', d: P('M3 9h13v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6zM16 11h2a3 3 0 0 1 0 6h-2M7 2v4M11 2v4') },
    restaurant:      { s: ['hotel'], fr: 'Restaurant', it: 'Ristorante', d: P('M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 22V2c-2.5 1.5-3 4-3 7v4h3') },
    bar:             { s: ['hotel'], fr: 'Bar', it: 'Bar', d: P('M4 3h16l-8 9zM12 12v8M8 21h8') },
    gym:             { s: ['hotel'], fr: 'Salle de sport', it: 'Palestra', d: P('M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12') },
    spa:             { s: ['hotel'], fr: 'Spa', it: 'Spa', d: P('M12 21c-4.4 0-8-3.1-8-7 2.5 0 5.5 1 8 4 2.5-3 5.5-4 8-4 0 3.9-3.6 7-8 7zM12 18c-2-2.5-2-6.5 0-11 2 4.5 2 8.5 0 11z') },
    elevator:        { s: ['hotel'], fr: 'Ascenseur', it: 'Ascensore', d: P('M5 2h14v20H5zM9 9l3-3 3 3M9 15l3 3 3-3') },
    pets:            { s: ['hotel', 'vehicle'], fr: 'Animaux acceptés', it: 'Animali ammessi', d: P('M7 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 13c-3 0-5 3-5 5a2 2 0 0 0 2 2c1 0 2-.5 3-.5s2 .5 3 .5a2 2 0 0 0 2-2c0-2-2-5-5-5z') },
    accessible:      { s: ['hotel', 'vehicle', 'service', 'common'], fr: 'Accessible fauteuil roulant', it: 'Accessibile in sedia a rotelle', d: P('M12 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 7h4l-1 6h5l2 6M13 13a5 5 0 1 1-6-4.5') },
    family:          { s: ['hotel', 'service'], fr: 'Familles', it: 'Famiglie', d: P('M7 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM3 22v-8a4 4 0 0 1 8 0M13 22v-8a4 4 0 0 1 8 0M10 22v-3a2 2 0 0 1 4 0v3') },
    reception_24h:   { s: ['hotel'], fr: 'Réception 24 h/24', it: 'Reception 24 ore', d: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2') },
    non_smoking:     { s: ['hotel', 'vehicle'], fr: 'Non-fumeur', it: 'Non fumatori', d: P('M2 2l20 20M12 12H2v4h14M18 12h4v4M18 8a3 3 0 0 0-3-3M22 8a7 7 0 0 0-7-7') },
    sea_view:        { s: ['hotel'], fr: 'Vue sur la mer', it: 'Vista mare', d: P('M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M12 10a4 4 0 0 0-8 0') },
    city_view:       { s: ['hotel'], fr: 'Vue sur la ville', it: 'Vista città', d: P('M3 21V9l5-3v15M8 21V4l7 3v14M15 21v-9l6 2v7M2 21h20') },
    balcony:         { s: ['hotel'], fr: 'Balcon', it: 'Balcone', d: P('M5 3h14v9H5zM12 3v9M3 12h18M5 12v9M9 12v9M15 12v9M19 12v9M3 21h18') },
    tv:              { s: ['hotel'], fr: 'Télévision', it: 'Televisione', d: P('M3 6h18v12H3zM8 21h8M9 2l3 4 3-4') },
    safe:            { s: ['hotel'], fr: 'Coffre-fort', it: 'Cassaforte', d: P('M3 3h18v16H3zM5 19v2M19 19v2M14 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM11 11h.01M17 8v6') },
    minibar:         { s: ['hotel'], fr: 'Minibar', it: 'Minibar', d: P('M6 2h12v20H6zM6 10h12M9 5v2M9 13v3') },
    shuttle:         { s: ['hotel', 'service'], fr: 'Navette', it: 'Navetta', d: P('M3 6h15l3 5v6H3zM3 11h18M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z') },
    baby_cot:        { s: ['hotel', 'vehicle'], fr: 'Lit bébé / siège enfant', it: 'Culla / seggiolino', d: P('M3 10h18v7H3zM5 10V6M19 10V6M3 13h18M5 17v3M19 17v3M8 10v7M12 10v7M16 10v7') },
    // ---- véhicules ----
    automatic:       { s: ['vehicle'], fr: 'Boîte automatique', it: 'Cambio automatico', d: P('M6 3h12v18H6zM9 7h6M12 7v10M9 13h6M10 17h4') },
    manual:          { s: ['vehicle'], fr: 'Boîte manuelle', it: 'Cambio manuale', d: P('M6 4a2 2 0 1 0 0 .01M12 4a2 2 0 1 0 0 .01M18 4a2 2 0 1 0 0 .01M6 20a2 2 0 1 0 0 .01M12 20a2 2 0 1 0 0 .01M6 6v12M12 6v12M18 6v6H6') },
    fuel:            { s: ['vehicle'], fr: 'Carburant', it: 'Carburante', d: P('M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M3 21h12M4 10h10M14 7l4 3v8a1.5 1.5 0 0 0 3 0v-7l-3-3') },
    electric:        { s: ['vehicle'], fr: 'Électrique', it: 'Elettrica', d: P('M13 2L4 14h7l-1 8 9-12h-7z') },
    gps:             { s: ['vehicle', 'service'], fr: 'GPS', it: 'Navigatore GPS', d: P('M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z') },
    bluetooth:       { s: ['vehicle'], fr: 'Bluetooth', it: 'Bluetooth', d: P('M7 7l10 10-5 5V2l5 5L7 17') },
    seats:           { s: ['vehicle'], fr: 'Places', it: 'Posti', d: P('M7 3h6a2 2 0 0 1 2 2v8H7zM5 13h12l2 5H5zM7 18v3M17 18v3') },
    luggage:         { s: ['vehicle', 'service'], fr: 'Bagages', it: 'Bagagli', d: P('M6 7h12v13H6zM9 7V4h6v3M9 11v5M15 11v5M8 20v1M16 20v1') },
    four_wheel:      { s: ['vehicle'], fr: '4 roues motrices', it: '4 ruote motrici', d: P('M5 7a2 2 0 1 0 0 .01M19 7a2 2 0 1 0 0 .01M5 17a2 2 0 1 0 0 .01M19 17a2 2 0 1 0 0 .01M7 7h10M7 17h10M12 7v10') },
    // ---- services ----
    guide:           { s: ['service'], fr: 'Guide', it: 'Guida', d: P('M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22v-6a6 6 0 0 1 12 0v6M4 11l-2 2M20 11l2 2') },
    audio_guide:     { s: ['service'], fr: 'Audioguide', it: 'Audioguida', d: P('M3 14v-2a9 9 0 0 1 18 0v2M3 14h3v6H3zM18 14h3v6h-3z') },
    skip_line:       { s: ['service'], fr: 'Coupe-file', it: 'Salta-fila', d: P('M3 12h14M13 6l6 6-6 6M3 5v14') },
    tickets:         { s: ['service'], fr: 'Billets inclus', it: 'Biglietti inclusi', d: P('M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10') },
    lunch:           { s: ['service'], fr: 'Repas inclus', it: 'Pasto incluso', d: P('M3 12h18M5 12a7 7 0 0 1 14 0M12 5V3M4 16h16l-2 4H6z') },
    pickup:          { s: ['service'], fr: 'Prise en charge à l’hôtel', it: 'Prelievo in hotel', d: P('M3 21V8l7-5 7 5v13M3 21h18M8 21v-6h4v6M17 13h4v8') },
    private_tour:    { s: ['service'], fr: 'Privé', it: 'Privato', d: P('M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4zM12 15v3') }
  };

  const lang = () => (TC.lang && TC.lang() === 'it' ? 'it' : 'fr');
  TC.icons = {
    ALL: ICONS,
    has: code => !!ICONS[code],
    label: code => (ICONS[code] ? ICONS[code][lang()] : code),
    // Codes disponibles pour une portée (hotel, vehicle, service), triés par libellé
    forScope: scope => Object.keys(ICONS).filter(k => ICONS[k].s.includes(scope) || ICONS[k].s.includes('common'))
      .sort((a, b) => TC.icons.label(a).localeCompare(TC.icons.label(b))),
    // Dessin ; décoratif par défaut (le libellé est écrit à côté)
    svg: (code, size = 20) => ICONS[code]
      ? `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${ICONS[code].d}"/></svg>`
      : '',
    // Pastilles « icône + libellé » pour une liste de codes enregistrés
    chips: codes => (codes || []).filter(c => ICONS[c]).map(c => `<span class="ichip">${TC.icons.svg(c, 16)}<span>${TC.u.esc(TC.icons.label(c))}</span></span>`).join(''),
    // Sélecteur réutilisable : cases à cocher (clavier natif) ; name = nom du groupe, selected = codes cochés
    picker: (name, scope, selected = []) => `<fieldset class="ipicker"><legend class="sr">${TC.u.esc(name)}</legend>${TC.icons.forScope(scope).map(c =>
      `<label class="ipick"><input type="checkbox" name="${TC.u.esc(name)}" value="${c}" ${selected.includes(c) ? 'checked' : ''}>${TC.icons.svg(c, 18)}<span>${TC.u.esc(TC.icons.label(c))}</span></label>`).join('')}</fieldset>`,
    picked: (root, name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value)
  };
})(window.TC);
