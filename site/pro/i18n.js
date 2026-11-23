/* Espace équipe — textes de l'interface, en français (fr) et en italien (it).
   Toute nouvelle clé doit exister dans les deux blocs. Le choix de langue est gardé dans le navigateur (tc-pro-lang). */
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
      soon_pay_3: 'Le montant est recalculé par le serveur avant tout encaissement.',
      ui_lang: 'Langue de l\u2019interface',
      dash_hi: 'Buongiorno {name}', dash_sum: '{n} demande(s) à traiter', dash_sum0: 'Aucune demande à traiter',
      k_new: 'Nouvelles demandes', k_new_late: '{n} en attente depuis plus de 12 h', k_new_ok: 'Aucune en retard',
      k_conf: 'Réservations confirmées ce mois-ci', k_ca: 'Encaissé ce mois-ci', k_ca_sub: 'Reste à encaisser : {x}',
      k_seats: 'Places restantes ce week-end', k_seats_na: 'Disponible avec le planning (bientôt)',
      todo_t: 'À traiter maintenant', todo_late: 'Nouvelle demande sans réponse depuis {h} h', todo_quote: 'Devis sans réponse depuis {d} jours', todo_pay: 'Reste à encaisser : {x}',
      todo_none: 'Rien d\u2019urgent pour l\u2019instant.', today_t: 'Départs d\u2019aujourd\u2019hui', today_na: 'Les départs du jour s\u2019afficheront ici avec le planning (bientôt).',
      src_t: 'D\u2019où viennent les demandes (30 jours)', src_none: 'Aucune demande sur les 30 derniers jours.', open: 'Ouvrir'
    },
    it: {
      app_title: 'Area team', tag: 'AREA TEAM',
      nav_requests: 'Richieste', nav_new: '+ Nuova richiesta', logout: 'Esci',
      role_admin: 'Amministratore', role_conseiller: 'Consulente', role_guide: 'Guida',
      login_t: 'Accesso all’area team', login_d: 'Inserisci il tuo indirizzo e-mail di lavoro: riceverai un link di accesso.',
      email: 'E-mail', password: 'Password', login_pw_b: 'Accedi', login_link_alt: 'Ricevi invece un link via e-mail',
      login_no_pw: 'Inserisci la password.', login_wrong: 'E-mail o password errata.', login_rate: 'Troppi tentativi. Riprova tra qualche minuto.',
      nav_password: 'La mia password', pw_t: 'Cambia la mia password', pw_d: 'Scegli una password lunga, che non usi da nessun’altra parte.',
      pw_new: 'Nuova password', pw_again: 'Conferma la password', pw_hint: 'Almeno 12 caratteri. Una frase di più parole è l’ideale.',
      pw_save: 'Salva la password', pw_short: 'La password deve avere almeno 12 caratteri.', pw_mismatch: 'Le due password non coincidono.', pw_ok: 'Password modificata',
      login_b: 'Ricevi il link di accesso', login_sending: 'Invio…',
      login_sent: 'Se questo indirizzo fa parte del team, gli è stato appena inviato un link di accesso. Aprilo su questo dispositivo.',
      login_err: 'Impossibile inviare il link al momento. Riprova tra qualche minuto.', login_bad_email: 'Indirizzo e-mail non valido.',
      login_link_err: 'Questo link di accesso non è più valido. Richiedine uno nuovo.',
      denied_t: 'Accesso non autorizzato', denied_d: 'Il tuo account ({email}) non ha accesso all’area team. Chiedi all’amministratore di aggiungerti.',
      guide_soon_t: 'La tua area guida arriva presto', guide_soon_d: 'Qui vedrai le partenze del giorno e l’elenco dei tuoi partecipanti.',
      loading: 'Caricamento…', load_err: 'Impossibile caricare i dati: {msg}',
      st_new: 'Nuove', st_in_progress: 'In corso', st_sent: 'Preventivo inviato', st_won: 'Confermata', st_done: 'Conclusa', st_lost: 'Annullata',
      st1_new: 'Nuova', st1_in_progress: 'In corso', st1_sent: 'Preventivo inviato', st1_won: 'Confermata', st1_done: 'Conclusa', st1_lost: 'Annullata',
      src_site: 'Sito', src_whatsapp: 'WhatsApp', src_agence: 'Agenzia', src_email: 'E-mail', src_telephone: 'Telefono',
      ty_all: 'Tutti', ty_activity: 'Attività', ty_bus: 'Bus', ty_circuit: 'Tour', ty_hotel: 'Hotel', ty_restaurant: 'Ristoranti', ty_custom: 'Su misura',
      custom_trip: 'Viaggio su misura',
      req_t: 'Richieste', req_d: 'Dal primo contatto alla conferma.',
      search: 'Cerca un cliente', show_closed: 'Mostra Concluse e Annullate', filter_type: 'Tipo',
      step: 'Fase', owner: 'Responsabile', nobody: 'Nessuno', people: '{n} pers.', no_date: 'data da definire',
      ago_min: '{n} min fa', ago_h: '{n} h fa', ago_d: '{n} g fa',
      col_empty: 'Nessuna richiesta', none_at_all: 'Ancora nessuna richiesta. Le richieste del sito appariranno qui in tempo reale.',
      live_new: 'Nuova richiesta: {name}', saved: 'Salvato', save_err: 'Salvataggio non riuscito: {msg}',
      back: '← Tutte le richieste', ref: 'Riferimento', source: 'Fonte', lang: 'Lingua', created: 'Creata il',
      wa: 'WhatsApp', mail: 'E-mail', recap_b: 'Invia il riepilogo', recap_t: 'Riepilogo per il cliente',
      copy: 'Copia il testo', copied: 'Testo copiato', send_wa: 'Invia su WhatsApp', close: 'Chiudi', no_phone: 'Nessun numero', no_email: 'Nessuna e-mail',
      items_t: 'Servizi', it_offer: 'Offerta', it_label: 'Descrizione', it_date: 'Data', it_time: 'Ora', it_people: 'Persone', it_amount: 'Importo (€)',
      it_total: 'Totale', it_add: 'Aggiungi il servizio', it_save: 'Salva la modifica', it_cancel: 'Annulla', it_edit: 'Modifica', it_del: 'Elimina',
      it_none: 'Ancora nessun servizio.', it_other: 'Altro (testo libero)', it_form: 'Aggiungi un servizio', it_form_edit: 'Modifica il servizio',
      e_label: 'Inserisci una descrizione.', e_amount: 'Importo non valido.', e_people: 'Numero di persone non valido.',
      pay_t: 'Pagamento', paid: 'Ricevuto', remaining: 'Da pagare', pay_amount: 'Importo (€)', pay_date: 'Data', pay_method: 'Metodo',
      m_especes: 'Contanti', m_virement: 'Bonifico', m_carte_sur_place: 'Carta in sede', m_stripe: 'Stripe',
      pay_add: 'Registra il pagamento', pay_none: 'Nessun pagamento registrato.', pay_link: 'Crea un link di pagamento', pay_soon: 'Presto (Stripe)',
      pay_del: 'Annulla questo pagamento', pay_progress: 'Pagato: {pct} %',
      cust_t: 'Cliente', phone: 'Telefono', hotel: 'Hotel', past: 'Prenotazioni precedenti', hotel_save: 'Salva l’hotel',
      status_t: 'Gestione', hist_t: 'Storico', hist_none: 'Nessun evento.', by: 'da {name}', system: 'sito web',
      note_t: 'Nota interna', note_d: 'Visibile al team e alla guida interessata (es. allergie). Mai al cliente.', note_save: 'Salva la nota',
      msg_t: 'Messaggio del cliente', not_found: 'Richiesta non trovata.', confirm_del: 'Clicca ancora una volta per confermare',
      new_t: 'Nuova richiesta', new_d: 'Per una richiesta ricevuta per telefono, WhatsApp, e-mail o in agenzia.',
      n_name: 'Nome del cliente', n_email: 'E-mail (facoltativa se c’è il telefono)', n_phone: 'Telefono / WhatsApp', n_source: 'Ricevuta tramite',
      n_offer: 'Offerta', n_date: 'Data desiderata', n_people: 'Persone', n_lang: 'Lingua del cliente', n_msg: 'Messaggio / dettagli', n_hotel: 'Hotel',
      n_create: 'Crea la richiesta', n_creating: 'Creazione…', e_name: 'Inserisci il nome del cliente.', e_contact: 'Inserisci un’e-mail o un telefono.', e_email: 'E-mail non valida.',
      choose: '— Scegli —',
      soon: 'Presto', soon_d: 'Questa sezione è in preparazione. Apparirà qui appena sarà pronta.', soon_what: 'Cosa permetterà', soon_back: '← Torna alle richieste',
      nav_dash: 'Cruscotto', nav_plan: 'Planning', nav_guides: 'Guide', nav_vg: 'Vista guida', nav_pay: 'Pagamento online',
      soon_dash_t: 'Cruscotto',
      soon_dash_1: 'Saluto personalizzato, data del giorno, numero di partenze del giorno e di richieste da gestire.',
      soon_dash_2: 'Indicatori calcolati sui dati reali.', soon_dash_3: 'Elenco «Da gestire ora».', soon_dash_4: 'Da dove arrivano le richieste negli ultimi 30 giorni.',
      soon_plan_t: 'Planning della settimana',
      soon_plan_1: 'Griglia di 7 giorni con navigazione settimana precedente / oggi / settimana successiva.',
      soon_plan_2: 'Ogni partenza: ora, offerta, riempimento (es. 11/15, «Completo»), guida assegnata.',
      soon_plan_3: 'Avvisi: guida da assegnare, numero minimo di partecipanti non raggiunto.',
      soon_plan_4: 'Creare, modificare o chiudere una partenza; vedere le prenotazioni di una partenza.',
      soon_guides_t: 'Guide',
      soon_guides_1: 'Elenco delle guide con le loro lingue e il numero di partenze della settimana.',
      soon_guides_2: 'Assegnazione di una guida a una partenza, con avviso se due partenze si sovrappongono.',
      soon_guides_3: 'Disponibilità indicate da ogni guida.',
      soon_vg_t: 'Vista guida (telefono)',
      soon_vg_1: '«La mia giornata»: partenze del giorno, punto d’incontro con link Google Maps, lingua, stato dei biglietti.',
      soon_vg_2: 'Elenco dei partecipanti da spuntare all’arrivo, con il contatore «7 / 15 arrivati».',
      soon_vg_3: 'Note utili (es. allergie); schede Oggi / Settimana / Disponibilità.',
      soon_pay_t: 'Pagamento online (Stripe)',
      soon_pay_1: 'Pulsante «Crea un link di pagamento» nella scheda, da inviare al cliente su WhatsApp o via e-mail.',
      soon_pay_2: 'Acconto o pagamento totale con carta, registrato automaticamente nella scheda.',
      soon_pay_3: 'L’importo viene ricalcolato dal server prima di ogni incasso.',
      ui_lang: 'Lingua dell’interfaccia',
      dash_hi: 'Buongiorno {name}', dash_sum: '{n} richiesta/e da gestire', dash_sum0: 'Nessuna richiesta da gestire',
      k_new: 'Nuove richieste', k_new_late: '{n} in attesa da più di 12 h', k_new_ok: 'Nessuna in ritardo',
      k_conf: 'Prenotazioni confermate questo mese', k_ca: 'Incassato questo mese', k_ca_sub: 'Da incassare: {x}',
      k_seats: 'Posti liberi questo fine settimana', k_seats_na: 'Disponibile con il planning (presto)',
      todo_t: 'Da gestire ora', todo_late: 'Nuova richiesta senza risposta da {h} h', todo_quote: 'Preventivo senza risposta da {d} giorni', todo_pay: 'Da incassare: {x}',
      todo_none: 'Niente di urgente al momento.', today_t: 'Partenze di oggi', today_na: 'Le partenze del giorno appariranno qui con il planning (presto).',
      src_t: 'Da dove arrivano le richieste (30 giorni)', src_none: 'Nessuna richiesta negli ultimi 30 giorni.', open: 'Apri'
    }

  };
  // Langues des clients (pour l'affichage et les messages envoyés au client)
  const LANG_NAMES = {
    fr: { en: 'Anglais', it: 'Italien', fr: 'Français', es: 'Espagnol', de: 'Allemand', pt: 'Portugais', nl: 'Néerlandais', zh: 'Chinois', ja: 'Japonais', ko: 'Coréen' },
    it: { en: 'Inglese', it: 'Italiano', fr: 'Francese', es: 'Spagnolo', de: 'Tedesco', pt: 'Portoghese', nl: 'Olandese', zh: 'Cinese', ja: 'Giapponese', ko: 'Coreano' }
  };
  TC.LANGS = LANG_NAMES.fr;
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
  TC.UI_LANGS = { fr: 'Français', it: 'Italiano' };
  TC.lang = () => lang;
  TC.locale = () => (lang === 'it' ? 'it-IT' : 'fr-FR');
  TC.setLang = l => {
    if (!DICT[l]) return;
    lang = l; TC.LANGS = LANG_NAMES[l]; document.documentElement.lang = l;
    try { localStorage.setItem('tc-pro-lang', l); } catch (e) { /* préférence non vitale */ }
  };
  // Langue au démarrage : choix enregistré, sinon langue du navigateur (italien si le navigateur est en italien)
  (() => { let l = null; try { l = localStorage.getItem('tc-pro-lang'); } catch (e) {} if (!DICT[l]) l = /^it/i.test(navigator.language || '') ? 'it' : 'fr'; TC.setLang(l); })();

  // L'historique est écrit en français par la base : traduction à l'affichage pour l'italien
  const HIST_IT = [[/^Demande créée \(source : (\w+)\)/, (_, k) => 'Richiesta creata (fonte: ' + ({ site: 'sito', agence: 'agenzia', telephone: 'telefono', whatsapp: 'WhatsApp', email: 'e-mail' }[k] || k) + ')'], [/^Étape : /, 'Fase: '], [/^Responsable : /, 'Responsabile: '],
    [/^Note interne modifiée$/, 'Nota interna modificata'], [/^Prestation ajoutée : /, 'Servizio aggiunto: '], [/^Prestation modifiée : /, 'Servizio modificato: '],
    [/^Prestation supprimée : /, 'Servizio eliminato: '], [/^Paiement enregistré : /, 'Pagamento registrato: '], [/^Paiement annulé : /, 'Pagamento annullato: '],
    [/Nouvelle/g, 'Nuova'], [/En cours/g, 'In corso'], [/Devis envoyé/g, 'Preventivo inviato'], [/Confirmée/g, 'Confermata'], [/Terminée/g, 'Conclusa'], [/Annulée/g, 'Annullata'],
    [/\bespeces\b/g, 'contanti'], [/\bvirement\b/g, 'bonifico'], [/carte sur place/g, 'carta in sede'], [/\bpersonne\b/g, 'nessuno'], [/ pers\. /g, ' pers. ']];
  TC.histMsg = m => (lang === 'it' ? HIST_IT.reduce((s, [a, b]) => s.replace(a, b), m || '') : m);
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
