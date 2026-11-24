# Plan de migration de la base vers une base locale — Turismo Club

- **Date** : 24/11/2026 · **Auteur** : agent D1 · **Validé par l'utilisateur** : non (en attente)

## 1. Source
| Élément | Valeur |
|---|---|
| Moteur et version | PostgreSQL géré par Supabase (version exacte à lire, voir `inventaire.md`) |
| Hébergement | Supabase (cloud), Francfort, offre gratuite |
| Taille totale / plus grosses tables | à mesurer (accès) — volume attendu très faible (service ouvert le 20/11/2026) |
| Nombre de tables / lignes | 19 tables `public` + `private.settings` + schéma `auth` ; lignes : à mesurer |
| Extensions, procédures, triggers, tâches planifiées | `citext`, `pg_net`, `pgcrypto` ; ≈ 27 fonctions ; 21 triggers ; aucune tâche planifiée (`pg_cron` non utilisé) |
| Encodage, collation, fuseau | à lire (attendu UTF-8, UTC côté serveur) |
| Fichiers stockés hors base | aucun |
| Accès nécessaire (à autoriser par l'utilisateur) | lecture via l'outil Supabase déjà connecté **ou** `supabase db dump` avec le mot de passe de la base (secret) |

## 2. Point bloquant à décider avant tout : la base n'est pas « seulement PostgreSQL »
Le site et l'espace équipe parlent à Supabase, pas directement à PostgreSQL. Une base PostgreSQL locale nue **ne suffit pas** à faire tourner le service :
- **Auth** (connexion de l'équipe, `auth.users`) ;
- **API REST** PostgREST (tout le site l'utilise, avec les rôles `anon` / `authenticated` et la RLS) ;
- **Realtime** (arrivée en direct des demandes et des e-mails) ;
- **pg_net** (notification par e-mail).

Trois possibilités, à choisir par toi :

| Option | Principe | Avantage | Inconvénient |
|---|---|---|---|
| **1. Supabase auto-hébergé** (Docker) | Même pile, sur une machine locale ou un serveur | Rien à réécrire ; on change seulement l'URL et les clés | Docker absent de ce Mac ; il faut une machine allumée en permanence et exposée sur Internet (coût / hébergement à décider) |
| **2. Copie locale pour développer et tester** (recommandé pour O3) | `supabase start` (Docker) ou PostgreSQL 16 + import des schémas `public`, `private`, `auth` | Tests actifs possibles sans toucher la production ; sauvegarde réelle et restauration testée | La production reste sur Supabase |
| **3. PostgreSQL nu + nouvelle API** | Remplacer Supabase par un serveur applicatif | Indépendance totale | Réécriture complète de la connexion, de l'API et du temps réel : hors proportion pour ce projet |

## 3. Cible (si option 2)
- Moteur : **PostgreSQL 16** ou pile Supabase locale (`supabase start`) ; écoute `127.0.0.1` uniquement.
- Rôles : `app_owner` (migrations) · `app_user` (exécution : `NOSUPERUSER`, `NOBYPASSRLS`, sans `DELETE`) + rôles Supabase `anon` / `authenticated` recréés.
- Espace disque disponible : **344 Gio libres** sur ce Mac (`df -h /`, 24/11/2026) — très au-delà de 3 × la taille de la source.
- Outils à installer (gratuits) : PostgreSQL 16 (`brew install postgresql@16`) ou Docker Desktop (gratuit pour un usage personnel ou une petite entreprise — **à vérifier**).

## 4. Méthode
- [x] `pg_dump -Fc` des schémas `public`, `private`, `auth` + `pg_restore` (via `supabase db dump` ou accès direct)
- [ ] réplication logique · [ ] `pgloader` · [ ] export CSV + `COPY` · [ ] ETL dédié
- Montants : déjà en centimes `integer` ; aucun flottant pendant le transfert.
- Les 19 migrations du dépôt permettent aussi de recréer le schéma à vide, puis d'importer les données seules.

## 5. Contrôles après migration à blanc
| Table | Lignes source | Lignes cible | Somme de contrôle | Séquence recalée | OK |
|---|---|---|---|---|---|
| (à remplir après accès : une ligne par table) | | | `md5(string_agg(t::text, '' order by id))` | `setval` sur max(id) | |

## 6. Bascule
Sans objet tant que la production reste sur Supabase (option 2). Si l'option 1 est choisie : sauvegarde testée, gel des écritures annoncé,
dernière synchronisation, contrôles, changement d'URL et de clés uniquement (site, espace équipe, Worker), **retour arrière** = remettre l'URL Supabase.

## 7. Sauvegardes
- `pg_dump` hebdomadaire chiffré, rotation 8 semaines, stockage hors Supabase : **emplacement à décider** (coût / prestataire).
- Restauration testée sur la copie locale : à faire après accord.
