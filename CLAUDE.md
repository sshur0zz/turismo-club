# CLAUDE.md — Turismo Club

Contexte du projet pour Claude Code. À lire avant toute modification.

## Le projet

Site web de **Turismo Club**, agence de voyage locale basée à **Rome (Italie)**, réalisé par Selim pour un proche (service rendu, non facturé).
L'agence vend : visites guidées et activités à Rome, bus touristiques, circuits et excursions en Italie, réservations d'hôtels et de restaurants partenaires.

- Langue principale du site : **anglais**. 10 langues proposées : en, it, fr, es, de, pt, nl, zh, ja, ko.
- Langue de travail avec Selim : **français**. Répondre en français, expliquer les choix techniques simplement (Selim apprend).
- Identité visuelle figée : palette **« Bordeaux & or »** (`accent #9F1239`, `dark #881337`, `light #FCD34D`, `hero #2B0F17`), logo **« L'Arche »** (SVG généré dans le code), police **Plus Jakarta Sans**.
- Domaine prévu : **turismoclub.it** (à acheter au nom de l'agence chez Aruba ou Register.it, DNS gérés par Cloudflare).

## Structure du dépôt

```
site/
  index.html        Site public (une seule page HTML : CSS + JS intégrés, routage par #hash)
  pro/index.html    Espace pro (même code, <html data-mode="pro">, noindex) — accessible uniquement par /pro/
  _headers          En-têtes Cloudflare (noindex sur /pro, sécurité)
supabase/
  migrations/       Historique de la base PostgreSQL, à appliquer dans l'ordre
  test/             Requêtes d'exemple + 99_test_local.sql (test local uniquement, JAMAIS sur Supabase)
README.md
```

`site/pro/index.html` est une copie de `site/index.html` avec `<html lang="fr" data-mode="pro">`, le titre « Turismo Club — Espace pro » et `<meta name="robots" content="noindex, nofollow">`.
**Après toute modification de `site/index.html`, régénérer `site/pro/index.html`** (même contenu, ces 3 différences seulement).

## Organisation du code (site/index.html)

Dans l'unique `<script>`, dans cet ordre :
1. `MODE` (public / pro), puis **langues** : `LANGS`, `LOCALES`, `UI` (dictionnaire des textes par langue), `tr(clé, vars)`, `L(objetMultilingue)`.
2. **Données** : `DESTINATIONS`, `ENVIES` (= les 5 catégories : activity, bus, circuit, hotel, restaurant), `ACTIVITIES` (14 offres ; `title`/`summary` traduits, détails des fiches en anglais), `isReq()` (hôtel/restaurant = demande, pas de paiement).
3. Contenu fictif (`GUIDES`, `RATINGS`, `REVIEWS`), état (`state`), utilitaires.
4. Illustrations SVG (`ILLOS`), logos (`logoSVG`), palettes (`PALETTES`, `applyPalette`).
5. Photos Wikimedia Commons (`PHOTOS`, `pic()`, `PHOTO_OF`) — crédits obligatoires sur la page `#credits`.
6. Espace pro (`STAFF`, `pro`, `pagePro()`…), stockage local de démo (`loadStore/saveStore`), **Supabase** (`SUPA`, `syncFromDb`, `sendRequestToDb`).
7. Pages publiques (`pageAccueil`, `pageCatalogue`, `pageFiche`, `pagePanier`, `pageConfirmation`, `pageDevis`, `pageCredits`), `applyChrome()` (en-tête/pied de page traduits), `setLang()`.
8. Routeur `render()` et gestionnaires d'événements (délégation sur `document`).

Règles :
- Tout texte affiché au visiteur passe par `tr('clé')` et existe **dans les 10 langues** de `UI`. Pas de texte en dur dans les templates publics.
- Nouvelle offre : l'ajouter dans `ACTIVITIES` (titre + résumé en 10 langues), dans `PHOTO_OF` / `ILLO_OF`, **et** dans la base (nouvelle migration).
- Accessibilité : vrais `<button>`, `<a href>`, `<label>` ; cibles ≥ 44 px ; contraste ≥ 4,5:1 ; `aria-label` sur les boutons-icônes.
- Pas de dépendance externe, pas de framework : le site doit rester un fichier statique déployable tel quel.
- Échapper toute donnée saisie par l'utilisateur avec `esc()` avant de l'insérer dans le HTML.

## Base de données (Supabase / PostgreSQL)

- Projet Supabase : **`turismo-club`**, réf. `dkocjkpcfneyevxexrsr`, région `eu-central-1` (Francfort). Actuellement dans l'organisation « Fidely » de Selim ; à transférer vers une organisation au nom de l'agence.
- URL API : `https://dkocjkpcfneyevxexrsr.supabase.co`. Le site utilise la clé **publique** (`sb_publishable_…`, déjà dans `SUPA`) : c'est normal.
- **Ne jamais** écrire dans le dépôt : la clé `service_role`, le mot de passe de la base, un fichier `.env`.
- Ce que le site public fait : lire la vue `site_offers` (prix, offres publiées) ; insérer dans `quote_requests` (devis, demandes hôtel/restaurant). RLS : un visiteur ne peut rien lire d'autre ni modifier.
- Rôles du personnel (table `staff`) : `admin`, `conseiller`, `guide`, avec droits ligne par ligne (fonctions `private.current_staff_role()` / `private.current_guide_id()`). Journal d'audit dans `audit_log`.
- **Toute modification de la base = un nouveau fichier dans `supabase/migrations/`** (`AAAAMMJJHHMMSS_description.sql`). Ne jamais modifier une migration déjà appliquée. Après une migration, vérifier les alertes de sécurité Supabase (Advisors) : objectif 0 alerte.
- Prix en **centimes** (`integer`), dates en `timestamptz`, heure de Rome (`Europe/Rome`) pour les créneaux.

## Déploiement

- Hébergement : **Cloudflare Pages**, relié au dépôt GitHub `sshur0zz/turismo-club`.
  Réglages : Build command vide · Build output directory `site`.
- Push sur `main` = mise en ligne automatique. Une autre branche = adresse de prévisualisation `*.pages.dev`. Tester sur une branche avant de fusionner dans `main`.
- Messages de commit en français, clairs (« Ajoute le circuit Toscane », « Corrige le prix du bus de nuit »).

## Contenu fictif à remplacer avant le vrai lancement

Bandeau « demo » en haut du site : il doit disparaître seulement quand tout ceci est réel :
- prix (base + `ACTIVITIES`), avis (`REVIEWS`, `RATINGS`), chiffres de l'accueil, guides, coordonnées (WhatsApp, adresse, e-mail), P.IVA ;
- hôtels et restaurants partenaires (actuellement génériques, sans nom) ;
- conditions d'annulation, mentions légales, politique de confidentialité RGPD, CGV (fournies par l'agence, droit italien) ;
- traductions relues par des natifs (priorité : zh, ja, ko).

## Refonte v2 en cours (branche `refonte-v2`)

Portail sur-mesure dynamique (rubriques, pages à blocs, plugins, espace client, back-office) : voir **`docs/ARCHITECTURE-V2.md`**, qui fait foi pour tout nouveau travail.
La v2 utilise SvelteKit (dossier `app/`) : la règle « pas de framework » ci-dessous ne s'applique qu'à l'ancien site `site/`, conservé jusqu'au basculement.

## Prochaines étapes de l'ancien site (dans l'ordre)

1. Brancher Cloudflare Pages sur ce dépôt et vérifier la mise en ligne automatique.
2. Acheter `turismoclub.it` et le relier à Cloudflare Pages (Custom domains).
3. Protéger `/pro/` (Cloudflare Access, accès par e-mail des employés).
4. Anti-spam sur les formulaires (Cloudflare Turnstile) avant d'ouvrir le site au public.
5. Relier l'espace pro à Supabase : connexion du personnel (Supabase Auth), lecture/écriture des réservations, devis et prix réels — remplace la démo `localStorage`.
6. Paiement Stripe (mode test d'abord) pour les activités, bus et circuits ; le serveur recalcule le prix et revérifie les places avant d'encaisser.
7. Pages légales (it + en), puis traduction complète des fiches.

## Vérifier son travail

- Ouvrir `site/index.html` dans un navigateur (ou `npx serve site`) : tester l'accueil, le catalogue, une fiche activité (créneau → panier → confirmation), une fiche hôtel (demande), le changement de langue, la vue mobile (390 px).
- Ouvrir `/pro/` : se connecter avec un compte de démo (`demo2026`) et vérifier que la réservation faite sur le site apparaît.
- Console du navigateur : zéro erreur JavaScript.
