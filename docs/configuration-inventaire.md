# Inventaire du codage en dur — Turismo Club

- **Date** : 24/11/2026 · **Commit** : `300ec42` · **Auteur** : agent C1
- Motifs recherchés : `http://`, `https://`, `localhost`, adresses IP, ports, `password`, `secret`, `key`, `token`, chaînes de connexion,
  chemins absolus, identifiants, taux, prix, devises, délais, comparaisons de pays, libellés d'interface.
- **Résultat principal : aucun secret dans le code ni dans l'historique Git.** Les secrets existants (`EMAIL_INGEST_SECRET`, `NOTIFY_SECRET`)
  sont dans les secrets du Worker Cloudflare et, pour la base, dans `private.settings` (empreinte pour l'ingestion, valeur pour la notification : SEC-007).

## Particularité de ce projet
Le site et l'espace équipe sont des **fichiers statiques sans étape de build ni serveur applicatif** : il n'y a pas de « démarrage » où valider
des variables d'environnement. Les équivalents sont :
- **navigateur** : un fichier de configuration unique (`config.js`) chargé avant le reste, avec contrôle des valeurs au chargement ;
- **Worker** : variables `[vars]` + secrets Cloudflare, validés au premier appel (refus explicite si absents) ;
- **base** : paramètres métier dans des tables, modifiables depuis l'espace équipe.

| ID | Fichier:ligne | Catégorie | Valeur (masquée si secret) | Destination | Statut |
|---|---|---|---|---|---|
| HC-001 | `site/index.html:918` | Infrastructure | URL du projet Supabase + clé **publique** | `config.js` unique (même valeur pour site et espace équipe) | ouvert |
| HC-002 | `site/pro/api.js:5-6` | Infrastructure | mêmes URL et clé publique (en double) | `config.js` unique | ouvert |
| HC-003 | `workers/email-entrant/wrangler.toml:10,12` | Infrastructure | URL Supabase + clé publique | déjà en `[vars]` : conforme | conforme |
| HC-004 | `workers/email-entrant/wrangler.toml:14,19` | Métier | adresse de notification de l'agence | déjà en `[vars]` ; à terme réglage en base | conforme |
| HC-005 | `workers/email-entrant/src/index.js:10` | Infrastructure | expéditeur `notifications@in.…` | `[vars]` | ouvert |
| HC-006 | `workers/email-entrant/src/index.js:75` | Infrastructure | URL de l'espace équipe dans l'e-mail | `[vars]` | ouvert |
| HC-007 | `site/index.html:252-260` | Métier | coordonnées de l'agence (`CONFIG` : raison sociale, P.IVA, e-mail, WhatsApp, adresse, REA, horaires) | table de réglages agence + écran admin (le site les lit au chargement) | ouvert |
| HC-008 | `site/index.html:613…` (`ACTIVITIES`) | Métier | prix, durées, capacités des offres en double avec la base | base seule source (Q-03) | ouvert |
| HC-009 | `site/index.html:960`, `site/pro/views/common.js:9` | Métier | devise `EUR` fixe | réglage agence (devise unique aujourd'hui : exception acceptable) | ouvert |
| HC-010 | `site/index.html:1138` | Constante | délai anti-robot 4 s (`MIN_FILL_MS`) | constante nommée : conforme | conforme |
| HC-011 | `supabase/migrations/…000016_emails_recus.sql:68` | Constante | limite 300 e-mails / heure | table de réglages | ouvert |
| HC-012 | `site/pro/views/planning.js` | Métier | fuseau `Europe/Rome` | réglage agence | ouvert |
| HC-013 | `site/pro/views/common.js:64`, `emails.js:15` | Infrastructure | liens Gmail | réglage « boîte mail de l'agence » | ouvert |
| HC-014 | `site/index.html:8,15,16,578` | Infrastructure | domaine `turismoclub.it` (canonical, Open Graph, données structurées) | exception : balises lues par les moteurs avant tout script | exception |
| HC-015 | `site/index.html` (`PHOTOS`) | Infrastructure | adresses Wikimedia des photos | médiathèque en base à terme | ouvert |
| HC-016 | `site/pro/views/login.js:79` | Constante | longueur minimale du mot de passe (12) | constante nommée | ouvert |
| HC-017 | `site/index.html` (`UI`…), `site/pro/i18n.js` | Texte | libellés | déjà dans des dictionnaires de traduction : conforme | conforme |

## Variables et réglages après correction (proposition)

| Variable / réglage | Obligatoire | Type / format | Exemple (fictif) | Usage |
|---|---|---|---|---|
| `SUPABASE_URL` (`config.js`, Worker) | oui | URL https | `https://exemple.supabase.co` | API de la base |
| `SUPABASE_PUBLISHABLE_KEY` (`config.js`, Worker) | oui | `sb_publishable_…` | `sb_publishable_xxxx` | clé publique (non secrète) |
| `EMAIL_INGEST_SECRET` (secret Worker) | oui | 64 hex | `●●●●` | dépôt des e-mails |
| `NOTIFY_SECRET` (secret Worker) | oui | 64 hex | `●●●●` | notifications |
| `NOTIFY_TO`, `NOTIFY_FROM`, `TEAM_URL` (`[vars]` Worker) | oui | e-mail / URL | `agence@exemple.it` | notifications |
| `DATABASE_URL` / `DATABASE_OWNER_URL` | seulement si base locale (O3) | URL PostgreSQL | `postgres://app_user:●●●●@127.0.0.1:5432/app` | exécution / migrations |
| Réglages agence (base) | – | coordonnées, devise, fuseau, boîte mail, limites | – | écran d'administration |

## Exceptions justifiées
- Clé **publique** Supabase dans les fichiers servis au navigateur : publique par conception, la sécurité repose sur la RLS.
- Domaine dans les balises `<head>` (HC-014) : lues par les moteurs de recherche sans exécuter de script.
