# Turismo Club — site web

Agence locale à Rome (Turismo Club di Riadh Mraihi, P.IVA 18751221005) : visites, bus, circuits, hôtels, restaurants. Site en anglais + 9 langues.

**En ligne :** https://turismoclub.it (aussi https://www.turismoclub.it et https://turismo-club.pages.dev)

## Contenu du dépôt

| Dossier | Rôle |
|---|---|
| `site/` | Le site publié par Cloudflare Pages. `site/index.html` = site client (tout est dans ce fichier), `site/pro/` = page « Espace équipe — en construction » (non indexée). |
| `supabase/migrations/` | Historique de la base PostgreSQL (Supabase), dans l'ordre. **Toute modification de la base passe par un nouveau fichier ici.** |
| `supabase/test/` | Requêtes d'exemple et script de test local (ne jamais lancer `99_test_local.sql` sur Supabase). |

## Ce qui fonctionne vraiment

- **Demandes de réservation** pour toutes les offres et pour les voyages sur-mesure : enregistrées dans Supabase (table `quote_requests`), avec un bouton « Envoyer aussi sur WhatsApp » et un lien e-mail. Si la base ne répond pas, le visiteur voit directement les boutons WhatsApp et e-mail : la demande n'est pas perdue.
- Anti-spam simple : champ piège invisible + délai minimum de 4 secondes.
- **Aucun paiement en ligne** : les prix sont indicatifs, l'agence confirme par écrit.
- Pages **Privacy & Cookies** et **Note legali** (anglais + italien), à faire relire par un professionnel.

## Comment le patron voit et traite une demande

1. Ouvrir https://supabase.com/dashboard/project/dkocjkpcfneyevxexrsr/editor → table **`quote_requests`** (lien aussi sur https://turismoclub.it/pro/).
2. Lire la demande : nom, e-mail, téléphone, offre (`offer_slug`), date, nombre de personnes, langue préférée, message.
3. Répondre au client (e-mail ou WhatsApp), puis changer **`status`** : `in_progress` (en cours), `sent` (proposition envoyée), `won` (confirmée) ou `lost` (perdue).

## Modifier le site

- Coordonnées de l'agence (WhatsApp, e-mail, adresse, horaires, REA) : uniquement le bloc **`CONFIG`** en haut du `<script>` de `site/index.html`. Un champ vide n'est pas affiché.
- Textes : dictionnaires `UI` et `UI2` (les 10 langues doivent être remplies).
- Envoyer la modification sur la branche `main` → mise en ligne automatique.

## Mise à jour automatique

Le dépôt est relié à Cloudflare Pages (projet `turismo-club`) : **chaque modification envoyée sur la branche `main` est mise en ligne automatiquement** (1 à 2 minutes).
- Branche `main` → site en ligne (`turismoclub.it`).
- Toute autre branche → adresse de prévisualisation `*.pages.dev`, pour tester avant de publier.
- La branche `refonte-v2` (futur portail) n'est pas prête : ne pas la fusionner.

Réglages Cloudflare Pages : *Framework preset* : None · *Build command* : (vide) · *Build output directory* : `site`.

## Base de données

Projet Supabase `turismo-club` (région Francfort). Le site lit la vue `site_offers` et dépose les demandes dans `quote_requests` avec la clé **publique** (normal qu'elle soit dans le code ; les droits RLS permettent seulement d'ajouter une demande, pas de lire).
Ne jamais mettre la clé `service_role` ni le mot de passe de la base dans ce dépôt.

## Reste à faire avant l'ouverture complète

- Adresse du siège, numéro REA, e-mail @turismoclub.it.
- Validation des prix, des fiches et des conditions d'annulation par l'agence.
- Relecture juridique des pages légales (commercialista ou avocat).
- Vrai espace équipe avec connexion ; paiement Stripe.
- Relecture des traductions par des natifs (chinois, japonais, coréen en priorité).
