# Audit de sécurité — Turismo Club

- **Date** : 24/11/2026 · **Commit audité** : `300ec42` · **Auteur** : agent S1
- **Mode** : passif et non destructif sur la production : lecture du code, des migrations, de l'historique Git, des dépendances
  et des en-têtes HTTP (`curl -sI`). Aucune requête d'écriture, aucun test d'intrusion, aucune lecture de la base distante pour cet audit.
- **Secrets** : signalés par emplacement uniquement, jamais recopiés.

## Cartographie (S1-01)

| Composant | Rôle | Exposition |
|---|---|---|
| `site/index.html` | Site public (HTML/CSS/JS en un fichier, 10 langues) | Cloudflare Pages, `turismoclub.it` |
| `site/pro/` | Espace équipe (application JS sans build, supabase-js 2.45.4 depuis jsDelivr avec SRI) | `turismoclub.it/pro/` (noindex) |
| Supabase `dkocjkpcfneyevxexrsr` | PostgreSQL + Auth + API REST (PostgREST) + Realtime + `pg_net` | Internet (API protégée par clé publique + RLS) |
| Worker `turismo-email-entrant` | Reçoit `demandes@in.turismoclub.it` (Email Routing) ; `POST /notify` envoie la notification « nouvelle demande » | `*.workers.dev` (404 hors `/notify`, `/notify` exige un secret) |
| Gmail (Google Workspace) | Boîte de l'agence, transfert vers le Worker | hors projet |

Points d'entrée :
- **Visiteur anonyme** : lecture `site_offers`, `activity_cards`, `departure_availability`, catalogue publié ; insertion dans `quote_requests` (consentement obligatoire, tailles bornées) ; RPC `ingest_email` (refusée sans le secret).
- **Personnel connecté** : tables métier selon le rôle (`admin`, `conseiller`, `guide`) par RLS ; RPC `guide_departures`, `guide_checkin`.
- **Tâches serveur** : trigger `notify_new_request` → `pg_net` → Worker `/notify`.

Flux de données personnelles : formulaire du site → `quote_requests` / `customers` → e-mail de notification à l'agence ; e-mails des clients → Gmail → Worker → `inbound_emails`.

## Synthèse

| Gravité | Nombre | Corrigés | Acceptés par l'utilisateur |
|---|---|---|---|
| Critique | 0 | – | – |
| Élevée | 2 | 1 (SEC-001, atténué) | 0 |
| Moyenne | 4 | 0 | 0 |
| Faible | 5 | 1 (SEC-011, sans objet) | 0 |

Points solides constatés : RLS sur toutes les tables (Advisors Supabase : seule alerte restante = protection des mots de passe compromis, offre payante) ;
aucun secret trouvé dans le code ni dans l'historique Git (toutes branches) ; supabase-js figé avec empreinte SRI ; échappement systématique
(`esc()` / `U.esc()`) avant insertion HTML, y compris pour le corps des e-mails reçus ; secret d'ingestion stocké uniquement sous forme d'empreinte SHA-256 ;
dépendances du Worker : 0 vulnérabilité (`npm audit`) ; redirection HTTP → HTTPS ; `/pro/` en `noindex` et `no-store`.

## Constats

| ID | Gravité | Domaine | Preuve (fichier:ligne / commande) | Impact | Correctif proposé | Effort | Statut |
|---|---|---|---|---|---|---|---|
| SEC-001 | Élevée | Auth | Compte administrateur provisoire `6769@…` actif (table `staff`), mot de passe très court communiqué en clair dans la conversation | Prise de contrôle complète de l'espace équipe (toutes les demandes clients) | Supprimer le compte ou changer son mot de passe (≥ 12 caractères) — **décision utilisateur** | S | atténué le 24/11/2026 : compte désactivé (`staff.is_active = false`), réversible ; suppression définitive à confirmer |
| SEC-002 | Élevée | Secrets | 2 jetons d'API Cloudflare et 1 jeton GitHub collés dans la conversation (hors Git) | Modification du DNS, du routage e-mail, du dépôt | Révoquer les 3 jetons (tableau de bord Cloudflare, GitHub → Settings → Tokens) — **décision utilisateur (secret)** | S | ouvert |
| SEC-003 | Moyenne | Accès / abus | `supabase/migrations/20261120000009_demandes_reservation.sql:16` (insertion anonyme sans limite de débit) + `…000017_notification_demande.sql` (1 e-mail par demande) | Un robot peut remplir la base et inonder la boîte mail | Limite par heure dans un trigger (comme `ingest_email`) ; Cloudflare Turnstile (gratuit) si des abus apparaissent | S | ouvert |
| SEC-004 | Moyenne | En-têtes | `curl -sI https://turismoclub.it/pro/` : ni `Content-Security-Policy` ni `Strict-Transport-Security` ; session Supabase dans `localStorage` (`site/pro/api.js:9`) | Une faille XSS permettrait de voler la session d'un membre de l'équipe | CSP stricte sur `/pro/*` dans `site/_headers` (scripts : soi-même + jsDelivr ; connexions : Supabase) ; HSTS activé dans Cloudflare | S | ouvert |
| SEC-005 | Moyenne | Auth | Aucune MFA ; protection « mots de passe compromis » désactivée (offre payante) | Mot de passe volé = accès complet | Activer la MFA TOTP de Supabase Auth (gratuite) pour le rôle `admin` | M | ouvert |
| SEC-006 | Moyenne | Infra | `api.github.com/repos/…/turismo-club` → HTTP 200 : **dépôt public** ; historique : ancien mot de passe de démonstration (`fc24aef`, `464cbab`, plus utilisé) | Schéma de base, politiques RLS et fonctionnement interne lisibles par tous | Passer le dépôt en privé (Cloudflare Pages fonctionne avec un dépôt privé) — **décision utilisateur** | S | ouvert |
| SEC-007 | Faible | Secrets | Secret `notify_secret` stocké en clair dans `private.settings` (migration 17) | Lisible par un accès propriétaire à la base | Supabase Vault, ou empreinte côté Worker | S | ouvert |
| SEC-008 | Faible | Journaux / RGPD | `inbound_emails`, `quote_requests`, `audit_log` sans durée de conservation | Conservation illimitée de données personnelles | Durée de conservation à décider (**décision juridique**), puis purge planifiée | M | ouvert |
| SEC-009 | Faible | Infra | Sauvegardes : non vérifiées (pas d'accès au tableau de bord pour cet audit) ; aucune restauration testée | Perte de données en cas d'erreur | Vérifier l'offre de sauvegarde Supabase ; `pg_dump` régulier chiffré hors Supabase (lié à O3) | M | ouvert |
| SEC-010 | Faible | Accès | `GRANT USAGE ON SCHEMA private TO anon` (migrations 06 et 16) | Fonctions privées appelables par un visiteur : `seats_taken`, `confirmed_bookings` (comptages), `ingest_email` (protégée par secret) | Accepté techniquement (relais `SECURITY INVOKER` exigé par le lint 0029) ; à revoir si une nouvelle fonction privée est ajoutée | – | ouvert |
| SEC-011 | Faible | Données | `supabase/migrations/20261118000002_seed_demo.sql` (guides, clients, avis fictifs) | Si encore présentes en production, ces données fictives peuvent être prises pour réelles | Vérifier leur présence (**accès base à autoriser**) ; supprimer ou marquer « fictif » | S | sans objet : vérifié le 24/11/2026, 0 guide, 0 avis, aucune donnée de démonstration restante |

`Access-Control-Allow-Origin: *` sur les pages statiques : sans impact (aucune donnée privée servie par Pages).

## Couverture du contrôle d'accès

L'autorisation est assurée **dans la base** (RLS + fonctions), jamais par l'interface. Synthèse à partir des migrations (vérification ligne à ligne sur la base réelle : soumise à accord, voir D1).

| Ressource / action | Authentification | Autorisation serveur | Isolation (objet d'un autre) | Remarque |
|---|---|---|---|---|
| Catalogue public (`site_offers`, `activity_cards`, `departure_availability`) | – (public) | ✅ RLS : publié seulement | ✅ | lecture seule |
| Dépôt de demande (`quote_requests` INSERT) | – (public) | ✅ RLS : statut `new`, consentement, tailles | ✅ aucune lecture possible | **pas de limite de débit** (SEC-003) |
| Demandes, clients, prestations, paiements | ✅ | ✅ RLS par rôle (`private.current_staff_role()`) | ✅ | admin / conseiller |
| Planning, départs, guides | ✅ | ✅ RLS par rôle ; guide via `guide_departures()` | ✅ guide limité à ses départs (`current_guide_id()`) | |
| E-mails reçus (`inbound_emails`) | ✅ | ✅ admin + conseiller ; suppression admin seulement | ✅ | contenu reçu immuable (trigger) |
| Dépôt d'e-mail (`ingest_email`) | secret partagé | ✅ empreinte SHA-256, limite 300/h | – | |
| Worker `/notify` | secret partagé | ✅ comparaison à temps constant | – | destinataire unique vérifié par Cloudflare |
| Journal `audit_log` | ✅ | ✅ admin | ✅ | ajout seulement |

L'application n'est pas multi-organisation (une seule agence) : pas de notion de « tenant ». Une ressource hors portée renvoie une **liste vide** (comportement PostgREST + RLS), ce qui équivaut au 404 demandé.

## Décisions demandées à l'utilisateur
- Rotation des secrets exposés : 2 jetons Cloudflare, 1 jeton GitHub (emplacement : conversation avec l'assistant).
- Compte administrateur provisoire `6769@…` : supprimer ou changer le mot de passe.
- Dépôt GitHub public → privé ?
- Durée de conservation des données personnelles (question juridique).
- Accès en lecture à la base distante pour vérifier les politiques, les données de démonstration et les volumes.
