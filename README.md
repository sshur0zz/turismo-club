# Turismo Club — site web

Agence locale à Rome : visites, bus, circuits, hôtels, restaurants. Site en anglais + 9 langues.

## Contenu du dépôt

| Dossier | Rôle |
|---|---|
| `site/` | Le site publié par Cloudflare Pages. `site/index.html` = site client, `site/pro/` = espace pro (non indexé). |
| `supabase/migrations/` | Historique de la base PostgreSQL (Supabase), dans l'ordre. **Toute modification de la base passe par un nouveau fichier ici.** |
| `supabase/test/` | Requêtes d'exemple et script de test local (ne jamais lancer `99_test_local.sql` sur Supabase). |

## Mise à jour automatique

Le dépôt est relié à Cloudflare Pages : **chaque modification envoyée sur la branche `main` est mise en ligne automatiquement** (1 à 2 minutes).
- Branche `main` → site en ligne (`turismoclub.it`).
- Toute autre branche → adresse de prévisualisation `*.pages.dev`, pour tester avant de publier.

Réglages Cloudflare Pages : *Framework preset* : None · *Build command* : (vide) · *Build output directory* : `site`.

## Base de données

Projet Supabase `turismo-club` (région Francfort). Le site lit la vue `site_offers` et dépose les demandes dans `quote_requests` avec la clé **publique** (normal qu'elle soit dans le code ; les droits RLS limitent ce qu'elle permet).
Ne jamais mettre la clé `service_role` ni le mot de passe de la base dans ce dépôt.

## Avant la mise en ligne réelle

- Remplacer les prix, avis, chiffres et coordonnées fictifs.
- Faire relire les traductions (chinois, japonais, coréen en priorité).
- Protéger `/pro/` (Cloudflare Access) et brancher la vraie connexion Supabase pour le personnel.
