# Inventaire de la base — Turismo Club

- **Date** : 24/11/2026 · **Auteur** : agent D1
- **Source de cet inventaire** : les 19 fichiers de `supabase/migrations/` (état du commit `300ec42`).
  Complété le 24/11/2026 par une **lecture seule** de la base distante (accord de Selim : « fais ce que tu trouves nécessaire »).

## Moteur et hébergement
| Élément | Valeur |
|---|---|
| Moteur | PostgreSQL **17.12** géré par Supabase · encodage UTF8 · fuseau serveur UTC · taille **15 Mo** |
| Hébergement | Supabase, projet `dkocjkpcfneyevxexrsr`, région `eu-central-1` (Francfort), offre gratuite |
| Briques Supabase utilisées | **Auth** (`auth.users`, `auth.identities`), **API REST** (PostgREST, rôles `anon` / `authenticated`), **Realtime** (publication `supabase_realtime`), **pg_net** (appels HTTP sortants) |
| Extensions déclarées | `citext`, `pg_net` (schéma `extensions`), `pgcrypto` (fournie par Supabase, utilisée pour `digest`) |
| Fichiers hors base | aucun (photos du site servies par Wikimedia ; pas de Storage Supabase) |

## Schéma
**Tables (`public`)** : `destinations`, `categories`, `activities`, `activity_categories`, `activity_steps`, `activity_photos`, `departures`,
`bookings`, `reviews`, `customers`, `quote_requests`, `request_items`, `payments`, `booking_events`, `staff`, `guides`, `guide_availability`,
`inbound_emails`, `audit_log` (19 tables).
**Schéma `private`** : `settings` (empreinte du secret d'ingestion, adresse et secret de notification) + fonctions de travail.
**Vues** : `site_offers`, `activity_cards`, `departure_availability`.

**Fonctions** (≈ 27) : rôles (`current_staff_role`, `current_guide_id`), capacité (`check_departure_capacity`, `seats_taken`, `confirmed_bookings`),
cycle des demandes (`quote_before_insert`, `quote_after_update`, `quote_first_item`, `quote_confirmed_at`, `item_link_departure`),
historique (`item_history`, `payment_history`, `status_label`, `staff_name`, `write_audit`), guides (`guide_departures`, `guide_checkin`,
`guide_only_checkin`), e-mails (`ingest_email`, `email_handled`), notification (`notify_new_request`), utilitaires (`euros`, `set_updated_at`).
**Triggers** : 21 (historique, audit, immutabilité des e-mails reçus, numérotation `TC-AAMM-NNN`, capacité, notification).

**Montants** : `integer` en centimes (`price_adult_cents`, `amount_cents`, `budget_cents`) — aucun flottant en base.
**Dates** : `timestamptz` ; créneaux interprétés en `Europe/Rome`.

## Volumes (lecture du 24/11/2026)
| Table | Lignes | | Table | Lignes |
|---|---|---|---|---|
| `departures` | 829 | | `activities` | 24 |
| `audit_log` | 1 171 | | `activity_categories` | 11 |
| `categories` | 7 | | `destinations` | 7 |
| `activity_steps` | 4 | | `private.settings` | 3 |
| `customers` | 2 | | `quote_requests` | 2 |
| `inbound_emails` | 2 | | `staff` | 2 (dont 1 compte provisoire désactivé) |
| `booking_events` | 2 | | `request_items` | 1 |
| `bookings`, `payments`, `guides`, `guide_availability`, `reviews`, `activity_photos` | 0 | | `auth.users` | 2 |

47 politiques RLS ; **aucune table `public` sans RLS** ; aucune donnée de démonstration restante.

## Commandes utilisées (lecture seule)
| Mesure | Commande prévue (lecture seule) |
|---|---|
| Version exacte, encodage, collation, fuseau | `select version(); show server_encoding; show timezone;` |
| Taille totale et par table | `pg_total_relation_size` sur chaque table |
| Lignes par table | `count(*)` par table |
| Données de démonstration encore présentes | lecture de `guides`, `reviews`, `customers` créés par la migration 02 |
| Politiques RLS effectives | `pg_policies` |
