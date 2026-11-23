/* Lecture simple d'un e-mail (copié depuis Gmail ou reçu par transfert) pour pré-remplir une demande.
   Pas d'IA : des règles simples. Ce qui n'est pas trouvé reste vide ; rien n'est inventé. */
window.TC = window.TC || {};
(function (TC) {
  const MONTHS = {
    jan: 1, janv: 1, janvier: 1, january: 1, gennaio: 1, enero: 1, januar: 1, janeiro: 1,
    fev: 2, fév: 2, fevr: 2, févr: 2, février: 2, fevrier: 2, feb: 2, february: 2, febbraio: 2, febrero: 2, februar: 2, fevereiro: 2,
    mar: 3, mars: 3, march: 3, marzo: 3, märz: 3, marz: 3, março: 3,
    apr: 4, avr: 4, avril: 4, april: 4, aprile: 4, abril: 4,
    mai: 5, may: 5, maggio: 5, mayo: 5, maio: 5,
    jun: 6, juin: 6, june: 6, giugno: 6, junio: 6, juni: 6, junho: 6,
    jul: 7, juil: 7, juillet: 7, july: 7, luglio: 7, julio: 7, juli: 7, julho: 7,
    aug: 8, aout: 8, août: 8, august: 8, agosto: 8,
    sep: 9, sept: 9, septembre: 9, september: 9, settembre: 9, septiembre: 9, setembro: 9,
    oct: 10, octobre: 10, october: 10, ottobre: 10, octubre: 10, oktober: 10, outubro: 10,
    nov: 11, novembre: 11, november: 11, noviembre: 11, novembro: 11,
    dec: 12, déc: 12, decembre: 12, décembre: 12, december: 12, dicembre: 12, diciembre: 12, dezember: 12, dezembro: 12
  };
  // Mots-clés → offre (seulement si l'offre existe dans la base)
  const OFFER_KEYS = [
    [/vatican|vaticano|sixtin|sistin|saint-pierre|san pietro|st\.? peter/i, 'vatican-sixtine'],
    [/colis[ée]e|colosseo|colosseum|coliseo|kolosseum|forum|palatin/i, 'colisee-forum-palatin'],
    [/trastevere|food tour|dégustation|degustazion/i, 'food-tour-trastevere'],
    [/pomp[ée]i|pompeii|pompeya|pompeji|naples|napoli/i, 'pompei-naples-journee'],
    [/florence|firenze|florencia|florenz/i, 'florence-journee'],
    [/amalfi|positano/i, 'amalfi-journee'],
    [/hop[- ]?on|bus touristique|tour in bus|bus tour/i, 'hop-on-hop-off']
  ];
  const LANG_HINTS = [[/\b(bonjour|bonsoir|merci|cordialement)\b/i, 'fr'], [/\b(buongiorno|buonasera|grazie|cordiali saluti)\b/i, 'it'],
    [/\b(hola|gracias|saludos)\b/i, 'es'], [/\b(guten tag|hallo|danke|grüße|gruesse)\b/i, 'de'], [/\b(olá|ola|obrigad[oa]|bom dia)\b/i, 'pt'],
    [/\b(goedendag|dank je|dank u|groeten)\b/i, 'nl'], [/[一-鿿]/, 'zh'], [/[぀-ヿ]/, 'ja'], [/[가-힯]/, 'ko'],
    [/\b(hello|hi|dear|thank you|thanks|regards)\b/i, 'en']];

  const pad = n => String(n).padStart(2, '0');
  function futureDate(d, m, y) {
    if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return null;
    const today = TC.u.todayRome();
    let year = y ? (y < 100 ? 2000 + y : y) : Number(today.slice(0, 4));
    let iso = `${year}-${pad(m)}-${pad(d)}`;
    if (!y && iso < today) iso = `${year + 1}-${pad(m)}-${pad(d)}`;
    return iso;
  }

  TC.parseEmail = (raw, fallback = {}) => {
    const text = String(raw || '').replace(/\r/g, '');
    const out = { name: '', email: '', phone: '', offer_slug: '', date: '', people: '', lang: '', message: '', found: [] };
    // Expéditeur : ligne « De : / From: / Da: / Von: » ou première ligne « Nom <adresse> »
    const fromLine = (text.match(/^(?:de|from|da|von|van)\s*:\s*(.+)$/im) || [])[1] || (text.split('\n')[0].includes('@') ? text.split('\n')[0] : '');
    const m = fromLine.match(/^\s*"?([^"<]*?)"?\s*<([^>\s]+@[^>\s]+)>/);
    if (m) { out.name = m[1].trim(); out.email = m[2].toLowerCase(); }
    else { const e = fromLine.match(/[^\s<>"]+@[^\s<>"]+\.[a-z]{2,}/i); if (e) out.email = e[0].toLowerCase(); }
    if (!out.email) { const e = text.match(/[^\s<>"():;,]+@[^\s<>"():;,]+\.[a-z]{2,}/i); if (e) out.email = e[0].toLowerCase(); }
    if (fallback.name && !out.name) out.name = fallback.name;
    if (fallback.email && !out.email) out.email = fallback.email;
    // Corps : sans les lignes d'en-tête
    const body = text.split('\n').filter(l => !/^(de|from|da|von|à|a|to|an|date|data|datum|objet|subject|oggetto|betreff|cc)\s*:/i.test(l.trim())).join('\n').trim();
    // Téléphone : premier numéro d'au moins 9 chiffres
    const ph = body.match(/(\+?\d[\d ().\-]{7,}\d)/g);
    if (ph) { const p = ph.find(x => x.replace(/\D/g, '').length >= 9 && x.replace(/\D/g, '').length <= 15); if (p) out.phone = p.trim(); }
    // Offre
    const offers = (TC.state && TC.state.offers) || [];
    for (const [re, slug] of OFFER_KEYS) if (re.test(body + ' ' + (fallback.subject || '')) && offers.some(o => o.slug === slug)) { out.offer_slug = slug; break; }
    // Personnes
    const pp = body.match(/(\d{1,2})\s*(?:personnes?|pers\.?|persone|people|persons|pax|adultes?|adults?|adulti|personas|personen|pessoas|personen)/i);
    if (pp) out.people = String(Number(pp[1]));
    // Date : 13/12/2026, 13/12, 13 décembre, December 13
    let d = null;
    const num = body.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
    if (num) d = futureDate(+num[1], +num[2], num[3] ? +num[3] : null);
    if (!d) {
      const w = body.match(/\b(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-zàâäçéèêëîïôöûüß]{3,10})\.?(?:\s+(\d{4}))?/i);
      if (w && MONTHS[w[2].toLowerCase()]) d = futureDate(+w[1], MONTHS[w[2].toLowerCase()], w[3] ? +w[3] : null);
    }
    if (!d) {
      const w = body.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
      if (w && MONTHS[w[1].toLowerCase()]) d = futureDate(+w[2], MONTHS[w[1].toLowerCase()], w[3] ? +w[3] : null);
    }
    if (d) out.date = d;
    for (const [re, l] of LANG_HINTS) if (re.test(body)) { out.lang = l; break; }
    out.message = body.slice(0, 2000);
    out.found = ['name', 'email', 'phone', 'offer_slug', 'date', 'people', 'lang'].filter(k => out[k]);
    return out;
  };
})(window.TC);
