# CLAUDE.md — Turismo Club

Contexte du projet pour Claude Code. À lire avant toute modification.

## Le projet

Site web de **Turismo Club**, agence de voyage locale basée à **Rome (Italie)**, réalisé par Selim pour un proche (service rendu, non facturé).
L'agence vend : visites guidées et activités à Rome, bus touristiques, circuits et excursions en Italie, réservations d'hôtels et de restaurants partenaires.

- Langue principale du site : **anglais**. 10 langues proposées : en, it, fr, es, de, pt, nl, zh, ja, ko.
- Langue de travail avec Selim : **français**. Répondre en français, expliquer les choix techniques simplement (Selim apprend).
- Identité visuelle figée : palette **« Bordeaux & or »** (`accent #9F1239`, `dark #881337`, `light #FCD34D`, `hero #2B0F17`), logo **« L'Arche »** (SVG généré dans le code), police **Plus Jakarta Sans**.
- Domaine : **turismoclub.it** et **www.turismoclub.it**, branchés sur Cloudflare Pages.
- Agence : **Turismo Club di Riadh Mraihi**, P.IVA 18751221005. Toutes les coordonnées sont dans le bloc `CONFIG` de `site/index.html` (seule source).

## Structure du dépôt

```
site/
  index.html        Site public (une seule page HTML : CSS + JS intégrés, routage par #hash)
  pro/              Espace équipe (FR, noindex) : application HTML/CSS/JS sans build
    index.html      Page + CSS « rouge sur blanc » ; charge supabase-js 2.45.4 (CDN, version figée + SRI)
    i18n.js         Textes de l'interface (dictionnaire, FR ; IT à ajouter) + messages au client en 10 langues
    api.js          Tous les appels Supabase (clé publique ; droits = RLS)
    app.js          Démarrage, connexion par lien magique (PKCE), rôles, navigation #/…, direct (Realtime)
    views/          common.js (outils, menu), login.js, tableau.js (tableau de bord), demandes.js (colonnes), dossier.js (fiche), nouvelle.js, bientot.js (rubriques à venir)
  _headers          En-têtes Cloudflare (noindex sur /pro, sécurité)
supabase/
  migrations/       Historique de la base PostgreSQL, à appliquer dans l'ordre
  test/             Requêtes d'exemple + 99_test_local.sql (test local uniquement, JAMAIS sur Supabase)
README.md
```

`site/pro/` est **indépendant** de `site/index.html` (plus de copie à régénérer). Garder `noindex` (meta + `_headers`).

## Espace équipe (site/pro/)

- Connexion : e-mail + mot de passe (`signInWithPassword`, choix de Selim le 20/11/2026), lien magique en option (`signInWithOtp`, `shouldCreateUser: false`). Aucun mot de passe dans le code. Page « Mon mot de passe » (12 caractères minimum).
- Accès : compte présent et actif dans `staff`. Sinon « Accès non autorisé ». Rôle `guide` : écran « bientôt » (phase C).
- Un **dossier** = une ligne de `quote_requests` (étapes `new` → `in_progress` → `sent` → `won` → `done`, `lost` = annulée). Référence `TC-AAMM-NNN`, client (`customers`) retrouvé par e-mail ou téléphone, première prestation créée automatiquement depuis l'offre du site (migrations 11-12).
- Prestations : `request_items`. Paiements manuels : `payments` (`request_id`, `method`, `paid_on`). Historique automatique : `booking_events` (`request_id`) écrit par des triggers (étape, responsable, paiement, prestation, note), avec l'auteur ; journal complet dans `audit_log`.
- Tous les textes passent par `TC.t('clé')` (i18n.js), **en français ET en italien** (blocs `fr` et `it`). Langue choisie gardée dans `localStorage` (`tc-pro-lang`). L'historique est écrit en français par la base et traduit à l'affichage (`TC.histMsg`). Messages au client : `TC.ct(langue, clé)`.
- Planning (`views/planning.js`), Guides (`views/guides.js`), Vue guide (`views/vueguide.js`, rôle `guide`, routes `#/jour`, `#/semaine`, `#/dispo`). Migration 14 : `request_items.departure_id` (rattachement automatique par offre + date + heure de Rome), `departures.tickets_status` / `note`, `activities.min_participants`, table `guide_availability`. Le guide ne lit plus `bookings` / `customers` directement : il passe par `guide_departures()` et `guide_checkin()` (relais SECURITY INVOKER dans `public`, travail dans `private`, migration 15).
- E-mails (`views/emails.js`, migration 16) : table `inbound_emails`, alimentée UNIQUEMENT par `ingest_email()` (relais public SECURITY INVOKER → `private.ingest_email`, secret partagé dont seule l'empreinte SHA-256 est en base dans `private.settings`). Le Worker `workers/email-entrant` (Cloudflare, `npx wrangler deploy`) n'a que la clé publique + le secret `EMAIL_INGEST_SECRET` (jamais dans Git ; `.dev.vars` ignoré). Le contenu reçu n'est pas modifiable (trigger). Lecture : admin + conseiller. Email Routing est activé seulement sur `in.turismoclub.it` : ne jamais l'activer sur le domaine principal (les MX Google le cassent).
- Notification « nouvelle demande » (migration 17) : trigger `notify_new_request` sur `quote_requests` (source = 'site') → `pg_net` POST vers le Worker `/notify` (adresse + secret dans `private.settings` : `notify_url`, `notify_secret` = secret Worker `NOTIFY_SECRET`) → binding `send_email` vers mraihiriadh@turismoclub.it (adresse vérifiée dans Cloudflare Email Routing → Destination addresses ; tout autre destinataire est refusé). Expéditeur notifications@in.turismoclub.it, Reply-To = client. Le Worker ignore ses propres notifications quand Gmail les retransfère. Une panne d'envoi ne bloque jamais la demande.
- « Coller un e-mail » : `views/emailparse.js` (`TC.parseEmail`), règles simples sans IA, n'invente rien.
- Tableau de bord (`views/tableau.js`) : calculé côté navigateur à partir de `quote_requests`, `request_items`, `payments` (date de confirmation : `confirmed_at`, migration 13). Jamais de chiffre inventé. « Places restantes ce week-end » = capacité − (réservations + prestations des dossiers confirmés) des départs ouverts samedi et dimanche.
- Tests : comptes et données marqués `TEST`, supprimés après les tests (jamais de vraies données clients). Ne pas supprimer d'entrées de `audit_log`.

## Organisation du code (site/index.html)

Dans l'unique `<script>`, dans cet ordre :
1. **`CONFIG`** (coordonnées réelles de l'agence ; champ vide = non affiché), `UI2` (textes ajoutés/corrigés, fusionnés dans `UI`), puis **langues** : `LANGS`, `LOCALES`, `UI`, `tr(clé, vars)`, `L(objetMultilingue)`.
2. **Données** : `DESTINATIONS`, `ENVIES` (= les 6 catégories : activity, bus, circuit, transfer, hotel, restaurant), `ACTIVITIES` (23 offres, dont 9 ajoutées le 24/11/2026 d'après le catalogue du marché romain — textes originaux, prix ~5 % sous la concurrence, migration 18 ; `onRequest: true` = « prix sur demande », `transfer` = prix par véhicule ; `title`/`summary` traduits, détails des fiches en anglais), `isReq()` (hôtel/restaurant = demande, pas de paiement).
3. État (`state`), utilitaires. (Avis, notes, guides et chiffres fictifs supprimés le 20/11/2026 : ne pas en recréer.)
4. Illustrations SVG (`ILLOS`), logos (`logoSVG`), palettes (`PALETTES`, `applyPalette`).
5. Photos Wikimedia Commons (`PHOTOS`, `pic()`, `PHOTO_OF`) — crédits obligatoires sur la page `#credits`.
6. **Supabase** (`SUPA`, `syncFromDb` : prix des offres ; `sendRequestToDb` : envoi des demandes).
7. Pages publiques (`pageAccueil`, `pageCatalogue`, `pageFiche`, `pageDevis`, `pageCredits`), **demandes de réservation** (`bookingBox`, `submitBooking`, `submitQuote`, `resultBox` : Supabase + repli WhatsApp/e-mail, anti-spam champ piège + délai 4 s), **pages légales** (`pagePrivacy`, `pageLegal`, textes en + it dans `LEGAL_TXT`), `applyChrome()` (en-tête/pied de page, lisent `CONFIG`), `setLang()`.
8. Routeur `render()` (`#accueil`, `#catalogue`, `#activite-<slug>`, `#devis`, `#privacy`, `#legal`, `#credits`) et gestionnaires d'événements (délégation sur `document`).

Règles :
- Tout texte affiché au visiteur passe par `tr('clé')` et existe **dans les 10 langues** de `UI`. Pas de texte en dur dans les templates publics.
- Nouvelle offre : l'ajouter dans `ACTIVITIES` (titre + résumé en 10 langues), dans `PHOTO_OF` / `ILLO_OF`, **et** dans la base (nouvelle migration).
- Accessibilité : vrais `<button>`, `<a href>`, `<label>` ; cibles ≥ 44 px ; contraste ≥ 4,5:1 ; `aria-label` sur les boutons-icônes.
- Pas de dépendance externe, pas de framework : le site doit rester un fichier statique déployable tel quel.
- Échapper toute donnée saisie par l'utilisateur avec `esc()` avant de l'insérer dans le HTML.
- **N'inventer aucune information sur l'agence** (avis, chiffres, adresse, licence, partenaires) : si elle manque, laisser le champ vide dans `CONFIG` et le signaler.
- Aucun paiement en ligne tant que Stripe n'est pas branché : tout passe par une **demande** (aucune mention de carte ou de « payer »).
- Seul stockage local autorisé : la langue (`tc-lang`), comme l'annonce la page Privacy.

## Base de données (Supabase / PostgreSQL)

- Projet Supabase : **`turismo-club`**, réf. `dkocjkpcfneyevxexrsr`, région `eu-central-1` (Francfort). Actuellement dans l'organisation « Fidely » de Selim ; à transférer vers une organisation au nom de l'agence.
- URL API : `https://dkocjkpcfneyevxexrsr.supabase.co`. Le site utilise la clé **publique** (`sb_publishable_…`, déjà dans `SUPA`) : c'est normal.
- **Ne jamais** écrire dans le dépôt : la clé `service_role`, le mot de passe de la base, un fichier `.env`.
- Ce que le site public fait : lire la vue `site_offers` (prix, offres publiées) ; insérer dans `quote_requests` **toutes les demandes** (activités, bus, circuits, hôtels, restaurants, sur-mesure), avec `offer_slug`, `preferred_language`, `consent_at` (migration 09). RLS : un visiteur peut insérer (consentement obligatoire, tailles limitées) mais ne peut rien lire ni modifier.
- Le patron voit les demandes dans le tableau de bord Supabase (Table Editor → `quote_requests`) et change `status` (`new` → `in_progress` → `sent` → `won`/`lost`).
- Rôles du personnel (table `staff`) : `admin`, `conseiller`, `guide`, avec droits ligne par ligne (fonctions `private.current_staff_role()` / `private.current_guide_id()`). Journal d'audit dans `audit_log`.
- **Toute modification de la base = un nouveau fichier dans `supabase/migrations/`** (`AAAAMMJJHHMMSS_description.sql`). Ne jamais modifier une migration déjà appliquée. Après une migration, vérifier les alertes de sécurité Supabase (Advisors) : objectif 0 alerte.
- Prix en **centimes** (`integer`), dates en `timestamptz`, heure de Rome (`Europe/Rome`) pour les créneaux.

## Déploiement

- Hébergement : **Cloudflare Pages** (projet `turismo-club`), relié au dépôt GitHub `sshur0zz/turismo-club` (intégration Git, pas de GitHub Actions ni de token).
  Réglages : Build command vide · Build output directory `site`.
- En ligne : https://turismoclub.it, https://www.turismoclub.it, https://turismo-club.pages.dev.
- La branche `refonte-v2` (portail SvelteKit, dossier `app/`) n'est **pas prête** : ne pas la fusionner dans `main`.
- Push sur `main` = mise en ligne automatique. Une autre branche = adresse de prévisualisation `*.pages.dev`. Tester sur une branche avant de fusionner dans `main`.
- Messages de commit en français, clairs (« Ajoute le circuit Toscane », « Corrige le prix du bus de nuit »).

## Ce qui est réel / ce qui reste provisoire (20/11/2026)

Réel : coordonnées (`CONFIG`), demandes de réservation → Supabase + WhatsApp/e-mail, pages Privacy & Note legali (brouillon), bandeau « Preview version ».
Provisoire ou à valider :
- prix des offres (indicatifs, affichés « à partir de · prix indicatif ») et contenu des fiches, à valider par l'agence ;
- hôtels et restaurants (génériques, sans nom) ; conditions d'annulation à fournir par l'agence ;
- adresse du siège, numéro REA, e-mail @turismoclub.it (`CONFIG.address`, `CONFIG.rea`, `CONFIG.email`) ;
- pages légales : à faire relire par un commercialista ou un avocat ;
- traductions à faire relire par des natifs (priorité : zh, ja, ko).

## Prochaines étapes (dans l'ordre)

1. Compléter `CONFIG` : adresse du siège, REA, e-mail @turismoclub.it (Cloudflare Email Routing).
2. Relecture juridique des pages légales ; conditions d'annulation et CGV fournies par l'agence.
3. Espace équipe : phase A en ligne (demandes, fiche, paiements) ; phase B planning et guides ; phase C tableau de bord et vue guide.
4. Anti-spam renforcé (Cloudflare Turnstile) si des demandes indésirables arrivent.
5. Paiement Stripe (mode test d'abord) ; le serveur recalcule le prix et revérifie les places avant d'encaisser.
6. Relecture des traductions par des natifs.

## Vérifier son travail

- Ouvrir le site (`python3 -m http.server -d site 8765`, puis http://127.0.0.1:8765) : accueil, catalogue, une fiche de chaque type, formulaire de demande (erreurs, consentement, confirmation, boutons WhatsApp/e-mail), changement de langue, vue mobile (390 px).
- Vérifier en JavaScript : extraire le `<script>` et lancer `node --check`.
- Après un test d'envoi réel, **supprimer la demande de test** dans Supabase.
- Console du navigateur : zéro erreur JavaScript.

## Intégration des fonctions de back-office (depuis le 24/11/2026)

On ajoute à ce projet, **sans rien remplacer**, des fonctions reprises d'un back-office de référence (flotte et location, états des lieux et dégâts,
hôtels, clients, pipeline Kanban, réservations, icônes). Le nom de ce back-office n'apparaît nulle part dans le dépôt.

- Ordre imposé : **phase 0** (sécurité `docs/securite/`, qualité `docs/qualite/`, codage en dur `docs/configuration-inventaire.md`,
  base `docs/donnees/`) → matrice des écarts validée ligne par ligne → lots.
- Une fonction qui existe déjà est **gardée telle quelle** ; la modifier demande l'accord de Selim.
- Les ajouts suivent la pile de ce projet : HTML/JS sans build, Supabase (SQL, RLS, fonctions `private` + relais `SECURITY INVOKER`),
  textes FR + IT dans `site/pro/i18n.js`, charte « rouge sur blanc ». Ils s'appuient sur les tables existantes (`customers`, `staff`,
  `quote_requests`, `activities`…) : **aucune table en double**.
- Lot = migration → interface → tests (Playwright, compte et données « TEST »/« fictif ») → aperçu à Selim → push sur `main` après son « ok » → vérification en ligne.
- Aucun codage en dur ; montants en **centimes entiers** (jamais de flottant) ; une modification n'envoie que les champs modifiés (équivalent `patchOf`).
- Aucune donnée inventée présentée comme réelle (prix fournisseur, taux, barème de dégâts, confirmation) ; démonstration marquée « fictif ».
- Autorisation dans la base (RLS) ; ressource hors portée = invisible (liste vide / 404).
- Service en ligne : aucune action destructive, aucun test actif sur la production.
- Arrêt et question pour toute décision juridique, fiscale, de coût, de secret ou d'accès à un prestataire externe (**y compris la lecture de la base distante**).
- Pas de sous-agents sauf demande ; les rôles (A0, S1, Q1, C1, D1, M1, M2, M3, U1, T1) sont tenus dans l'ordre.

### Commandes du projet
- Installation : aucune pour le site (fichiers statiques) ; Worker : `cd workers/email-entrant && npm ci`
- Aperçu local : `python3 -m http.server -d site 8765` → http://127.0.0.1:8765
- Vérification JS : extraire le `<script>` de `site/index.html` puis `node --check`
- Tests : Playwright (à ranger dans `tests/`, voir `docs/qualite/dette.md` Q-02)
- Migrations : nouveau fichier `supabase/migrations/AAAAMMJJHHMMSS_*.sql`, appliqué sur Supabase, puis Advisors
- Déploiement : site = push sur `main` (Cloudflare Pages) ; Worker = `cd workers/email-entrant && npx wrangler@4.45.0 deploy`
