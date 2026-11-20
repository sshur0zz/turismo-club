/* Espace équipe — textes de l'interface.
   Langue actuelle : français. Pour ajouter l'italien : copier le bloc fr en it, traduire, puis TC.setLang('it'). */
window.TC = window.TC || {};
(function (TC) {
  const DICT = {
    fr: {
      app_title: 'Espace équipe', tag: 'ESPACE ÉQUIPE',
      nav_requests: 'Demandes', nav_new: '+ Nouvelle demande', logout: 'Se déconnecter',
      role_admin: 'Administrateur', role_conseiller: 'Conseiller', role_guide: 'Guide',
      // Connexion
      login_t: 'Connexion à l’espace équipe', login_d: 'Saisissez votre adresse e-mail professionnelle : vous recevrez un lien de connexion.',
      email: 'E-mail', password: 'Mot de passe', login_pw_b: 'Se connecter', login_link_alt: 'Recevoir plutôt un lien par e-mail',
      login_no_pw: 'Saisissez votre mot de passe.', login_wrong: 'E-mail ou mot de passe incorrect.', login_rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
      nav_password: 'Mon mot de passe', pw_t: 'Changer mon mot de passe', pw_d: 'Choisissez un mot de passe long, que vous n\u2019utilisez nulle part ailleurs.',
      pw_new: 'Nouveau mot de passe', pw_again: 'Confirmer le mot de passe', pw_hint: '12 caractères minimum. Une phrase de plusieurs mots est idéale.',
      pw_save: 'Enregistrer le mot de passe', pw_short: 'Le mot de passe doit faire au moins 12 caractères.', pw_mismatch: 'Les deux mots de passe ne sont pas identiques.', pw_ok: 'Mot de passe modifié',
      login_b: 'Recevoir le lien de connexion', login_sending: 'Envoi…',
      login_sent: 'Si cette adresse fait partie de l’équipe, un lien de connexion vient de lui être envoyé. Ouvrez-le sur cet appareil.',
      login_err: 'Impossible d’envoyer le lien pour l’instant. Réessayez dans quelques minutes.', login_bad_email: 'Adresse e-mail invalide.',
      login_link_err: 'Ce lien de connexion n’est plus valable. Demandez-en un nouveau.',
      denied_t: 'Accès non autorisé', denied_d: 'Votre compte ({email}) n’a pas accès à l’espace équipe. Demandez à l’administrateur de vous ajouter.',
      guide_soon_t: 'Votre espace guide arrive bientôt', guide_soon_d: 'Vous verrez ici vos départs du jour et la liste de vos participants.',
      loading: 'Chargement…', load_err: 'Impossible de charger les données : {msg}',
      // Étapes
      st_new: 'Nouvelles', st_in_progress: 'En cours', st_sent: 'Devis envoyé', st_won: 'Confirmée', st_done: 'Terminée', st_lost: 'Annulée',
      st1_new: 'Nouvelle', st1_in_progress: 'En cours', st1_sent: 'Devis envoyé', st1_won: 'Confirmée', st1_done: 'Terminée', st1_lost: 'Annulée',
      // Sources
      src_site: 'Site', src_whatsapp: 'WhatsApp', src_agence: 'Agence', src_email: 'E-mail', src_telephone: 'Téléphone',
      // Types
      ty_all: 'Tous', ty_activity: 'Activités', ty_bus: 'Bus', ty_circuit: 'Circuits', ty_hotel: 'Hôtels', ty_restaurant: 'Restaurants', ty_custom: 'Sur-mesure',
      custom_trip: 'Voyage sur-mesure',
      // Tableau
      req_t: 'Demandes', req_d: 'De la première prise de contact à la confirmation.',
      search: 'Rechercher un client', show_closed: 'Afficher Terminées et Annulées', filter_type: 'Type',
      step: 'Étape', owner: 'Responsable', nobody: 'Personne', people: '{n} pers.', no_date: 'date à définir',
      ago_min: 'il y a {n} min', ago_h: 'il y a {n} h', ago_d: 'il y a {n} j',
      col_empty: 'Aucune demande', none_at_all: 'Aucune demande pour l’instant. Les demandes du site apparaîtront ici en direct.',
      live_new: 'Nouvelle demande : {name}', saved: 'Enregistré', save_err: 'Échec de l’enregistrement : {msg}',
      // Fiche
      back: '← Toutes les demandes', ref: 'Référence', source: 'Source', lang: 'Langue', created: 'Créée le',
      wa: 'WhatsApp', mail: 'E-mail', recap_b: 'Envoyer le récapitulatif', recap_t: 'Récapitulatif pour le client',
      copy: 'Copier le texte', copied: 'Texte copié', send_wa: 'Envoyer par WhatsApp', close: 'Fermer', no_phone: 'Pas de numéro', no_email: 'Pas d’e-mail',
      items_t: 'Prestations', it_offer: 'Offre', it_label: 'Description', it_date: 'Date', it_time: 'Heure', it_people: 'Personnes', it_amount: 'Montant (€)',
      it_total: 'Total', it_add: 'Ajouter la prestation', it_save: 'Enregistrer la modification', it_cancel: 'Annuler', it_edit: 'Modifier', it_del: 'Supprimer',
      it_none: 'Aucune prestation pour l’instant.', it_other: 'Autre (saisie libre)', it_form: 'Ajouter une prestation', it_form_edit: 'Modifier la prestation',
      e_label: 'Indiquez une description.', e_amount: 'Montant invalide.', e_people: 'Nombre de personnes invalide.',
      pay_t: 'Paiement', paid: 'Reçu', remaining: 'Reste à payer', pay_amount: 'Montant (€)', pay_date: 'Date', pay_method: 'Moyen',
      m_especes: 'Espèces', m_virement: 'Virement', m_carte_sur_place: 'Carte sur place', m_stripe: 'Stripe',
      pay_add: 'Enregistrer le paiement', pay_none: 'Aucun paiement enregistré.', pay_link: 'Créer un lien de paiement', pay_soon: 'Bientôt (Stripe)',
      pay_del: 'Annuler ce paiement', pay_progress: 'Payé : {pct} %',
      cust_t: 'Client', phone: 'Téléphone', hotel: 'Hôtel', past: 'Réservations passées', hotel_save: 'Enregistrer l’hôtel',
      status_t: 'Suivi', hist_t: 'Historique', hist_none: 'Aucun événement.', by: 'par {name}', system: 'site web',
      note_t: 'Note interne', note_d: 'Visible par l’équipe et par le guide concerné (ex. allergies). Jamais par le client.', note_save: 'Enregistrer la note',
      msg_t: 'Message du client', not_found: 'Demande introuvable.', confirm_del: 'Cliquez encore une fois pour confirmer',
      // Nouvelle demande
      new_t: 'Nouvelle demande', new_d: 'Pour une demande reçue par téléphone, WhatsApp, e-mail ou à l’agence.',
      n_name: 'Nom du client', n_email: 'E-mail (facultatif si téléphone)', n_phone: 'Téléphone / WhatsApp', n_source: 'Reçue par',
      n_offer: 'Offre', n_date: 'Date souhaitée', n_people: 'Personnes', n_lang: 'Langue du client', n_msg: 'Message / détails', n_hotel: 'Hôtel',
      n_create: 'Créer la demande', n_creating: 'Création…', e_name: 'Indiquez le nom du client.', e_contact: 'Indiquez un e-mail ou un téléphone.', e_email: 'E-mail invalide.',
      choose: '— Choisir —',
      // Rubriques à venir
      soon: 'Bientôt', soon_d: 'Cette rubrique est en préparation. Elle s\u2019affichera ici dès qu\u2019elle sera prête.', soon_what: 'Ce qu\u2019elle permettra', soon_back: '← Retour aux demandes',
      nav_dash: 'Tableau de bord', nav_plan: 'Planning', nav_guides: 'Guides', nav_vg: 'Vue guide', nav_pay: 'Paiement en ligne',
      soon_dash_t: 'Tableau de bord',
      soon_dash_1: 'Bonjour personnalisé, date du jour, nombre de départs du jour et de demandes à traiter.',
      soon_dash_2: 'Indicateurs calculés sur vos vraies données : nouvelles demandes, réservations confirmées du mois, chiffre d\u2019affaires et reste à encaisser, places restantes ce week-end.',
      soon_dash_3: 'Liste « À traiter maintenant » : demandes en retard, devis sans réponse depuis 48 h, acomptes en attente.',
      soon_dash_4: 'D\u2019où viennent les demandes sur 30 jours (site, WhatsApp, agence, e-mail).',
      soon_plan_t: 'Planning de la semaine',
      soon_plan_1: 'Grille de 7 jours avec navigation semaine précédente / aujourd\u2019hui / semaine suivante.',
      soon_plan_2: 'Chaque départ : heure, offre, remplissage (ex. 11/15, « Complet »), guide attribué.',
      soon_plan_3: 'Alertes : guide à attribuer, minimum de participants non atteint.',
      soon_plan_4: 'Créer, modifier ou fermer un départ ; voir les réservations d\u2019un départ.',
      soon_guides_t: 'Guides',
      soon_guides_1: 'Liste des guides avec leurs langues et leur nombre de départs de la semaine.',
      soon_guides_2: 'Attribution d\u2019un guide à un départ, avec alerte si deux départs se chevauchent.',
      soon_guides_3: 'Disponibilités indiquées par chaque guide.',
      soon_vg_t: 'Vue guide (téléphone)',
      soon_vg_1: '« Ma journée » : départs du jour, point de rendez-vous avec lien Google Maps, langue, état des billets.',
      soon_vg_2: 'Liste des participants à cocher à l\u2019arrivée, avec le compteur « 7 / 15 arrivés ».',
      soon_vg_3: 'Notes utiles (ex. allergies) ; onglets Aujourd\u2019hui / Semaine / Disponibilités.',
      soon_pay_t: 'Paiement en ligne (Stripe)',
      soon_pay_1: 'Bouton « Créer un lien de paiement » dans la fiche, à envoyer au client par WhatsApp ou e-mail.',
      soon_pay_2: 'Acompte ou paiement total par carte, enregistré automatiquement dans la fiche.',
      soon_pay_3: 'Le montant est recalculé par le serveur avant tout encaissement.'
    }
  };
  // Langues des clients (pour l'affichage et les messages envoyés au client)
  TC.LANGS = { en: 'Anglais', it: 'Italien', fr: 'Français', es: 'Espagnol', de: 'Allemand', pt: 'Portugais', nl: 'Néerlandais', zh: 'Chinois', ja: 'Japonais', ko: 'Coréen' };
  // Messages au client, dans SA langue
  TC.CLIENT = {
    en: { hi: 'Hello {name}, this is Turismo Club about your request {ref}.', recap: 'Summary of your booking {ref}', total: 'Total', paid: 'Paid', left: 'Remaining', people: 'people', thanks: 'Thank you, see you soon in Rome!' },
    it: { hi: 'Buongiorno {name}, siamo Turismo Club per la sua richiesta {ref}.', recap: 'Riepilogo della prenotazione {ref}', total: 'Totale', paid: 'Pagato', left: 'Da pagare', people: 'persone', thanks: 'Grazie, a presto a Roma!' },
    fr: { hi: 'Bonjour {name}, c’est Turismo Club au sujet de votre demande {ref}.', recap: 'Récapitulatif de votre réservation {ref}', total: 'Total', paid: 'Réglé', left: 'Reste à payer', people: 'personnes', thanks: 'Merci, à bientôt à Rome !' },
    es: { hi: 'Hola {name}, le escribe Turismo Club sobre su solicitud {ref}.', recap: 'Resumen de su reserva {ref}', total: 'Total', paid: 'Pagado', left: 'Pendiente', people: 'personas', thanks: '¡Gracias, hasta pronto en Roma!' },
    de: { hi: 'Hallo {name}, hier ist Turismo Club zu Ihrer Anfrage {ref}.', recap: 'Zusammenfassung Ihrer Buchung {ref}', total: 'Gesamt', paid: 'Bezahlt', left: 'Offen', people: 'Personen', thanks: 'Vielen Dank, bis bald in Rom!' },
    pt: { hi: 'Olá {name}, fala a Turismo Club sobre o seu pedido {ref}.', recap: 'Resumo da sua reserva {ref}', total: 'Total', paid: 'Pago', left: 'Por pagar', people: 'pessoas', thanks: 'Obrigado, até breve em Roma!' },
    nl: { hi: 'Hallo {name}, u spreekt met Turismo Club over uw aanvraag {ref}.', recap: 'Overzicht van uw boeking {ref}', total: 'Totaal', paid: 'Betaald', left: 'Nog te betalen', people: 'personen', thanks: 'Bedankt, tot snel in Rome!' },
    zh: { hi: '{name}您好，这里是 Turismo Club，关于您的申请 {ref}。', recap: '您的预订 {ref} 摘要', total: '总计', paid: '已付', left: '待付', people: '人', thanks: '谢谢，罗马见！' },
    ja: { hi: '{name}様、Turismo Clubです。お問い合わせ {ref} についてご連絡いたします。', recap: 'ご予約 {ref} の概要', total: '合計', paid: 'お支払い済み', left: '残額', people: '名', thanks: 'ありがとうございます。ローマでお会いしましょう！' },
    ko: { hi: '{name}님, 안녕하세요. 문의하신 {ref} 건으로 연락드리는 Turismo Club입니다.', recap: '예약 {ref} 요약', total: '합계', paid: '결제 완료', left: '잔액', people: '명', thanks: '감사합니다. 로마에서 뵙겠습니다!' }
  };
  let lang = 'fr';
  TC.setLang = l => { if (DICT[l]) lang = l; };
  TC.t = (k, vars) => {
    let s = DICT[lang][k] != null ? DICT[lang][k] : (DICT.fr[k] != null ? DICT.fr[k] : k);
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => (vars[v] != null ? vars[v] : ''));
    return s;
  };
  TC.ct = (clientLang, k, vars) => {
    const d = TC.CLIENT[clientLang] || TC.CLIENT.en;
    let s = d[k] != null ? d[k] : TC.CLIENT.en[k];
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => (vars[v] != null ? vars[v] : ''));
    return s;
  };
})(window.TC);
