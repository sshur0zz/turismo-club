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
  pro/index.html    Page simple « Espace équipe — en construction » (FR, noindex) : explique où voir les demandes dans Supabase
  _headers          En-têtes Cloudflare (noindex sur /pro, sécurité)
supabase/
  migrations/       Historique de la base PostgreSQL, à appliquer dans l'ordre
  test/             Requêtes d'exemple + 99_test_local.sql (test local uniquement, JAMAIS sur Supabase)
README.md
```

`site/pro/index.html` est une page **indépendante** depuis le 20/11/2026 (l'ancienne démo avec mot de passe a été retirée) : inutile de la régénérer quand on modifie `site/index.html`. Garder `noindex` (meta + `_headers`).

## Organisation du code (site/index.html)

Dans l'unique `<script>`, dans cet ordre :
1. **`CONFIG`** (coordonnées réelles de l'agence ; champ vide = non affiché), `UI2` (textes ajoutés/corrigés, fusionnés dans `UI`), puis **langues** : `LANGS`, `LOCALES`, `UI`, `tr(clé, vars)`, `L(objetMultilingue)`.
2. **Données** : `DESTINATIONS`, `ENVIES` (= les 5 catégories : activity, bus, circuit, hotel, restaurant), `ACTIVITIES` (14 offres ; `title`/`summary` traduits, détails des fiches en anglais), `isReq()` (hôtel/restaurant = demande, pas de paiement).
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
3. Vrai espace équipe avec connexion (Supabase Auth) — en cours dans `refonte-v2`.
4. Anti-spam renforcé (Cloudflare Turnstile) si des demandes indésirables arrivent.
5. Paiement Stripe (mode test d'abord) ; le serveur recalcule le prix et revérifie les places avant d'encaisser.
6. Relecture des traductions par des natifs.

## Vérifier son travail

- Ouvrir le site (`python3 -m http.server -d site 8765`, puis http://127.0.0.1:8765) : accueil, catalogue, une fiche de chaque type, formulaire de demande (erreurs, consentement, confirmation, boutons WhatsApp/e-mail), changement de langue, vue mobile (390 px).
- Vérifier en JavaScript : extraire le `<script>` et lancer `node --check`.
- Après un test d'envoi réel, **supprimer la demande de test** dans Supabase.
- Console du navigateur : zéro erreur JavaScript.
