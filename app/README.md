# Turismo Club v2 — application (SvelteKit)

Site public + espace client (`/compte`) + back-office (`/admin`). Plan complet : `../docs/ARCHITECTURE-V2.md`.

## Commandes (depuis `app/`)

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances (une fois, ou après un `git pull`) |
| `npm run dev` | Lance le site en local sur http://localhost:5173 |
| `npm run build` | Construit la version de production (ce que fait Cloudflare) |
| `npm run check` | Vérifie les types (2 erreurs connues dans `src/lib/paraglide/server.js`, code généré) |
| `npm run format` | Remet le code en forme |
| `node scripts/import-ui-v1.mjs` | Ré-importe les textes de l'ancien site — **écrase** `messages/*.json`, à ne plus utiliser une fois les textes modifiés |

## Textes et langues

Textes d'interface : `messages/{langue}.json` (10 langues, anglais = référence). Dans le code : `m.cle()`.
Une adresse = une langue : `/` anglais, `/fr/…`, `/it/…`, etc.

## Connexion

Lien magique par e-mail (Supabase Auth). `/compte` exige d'être connecté ; `/admin` exige une ligne active dans la table `staff` (dont `id` = l'identifiant Supabase Auth de l'employé).
