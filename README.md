# Turismo Club — site web

Agence locale à Rome (Turismo Club di Riadh Mraihi, P.IVA 18751221005) : visites, bus, circuits, hôtels, restaurants. Site en anglais + 9 langues.

**En ligne :** https://turismoclub.it (aussi https://www.turismoclub.it et https://turismo-club.pages.dev)

## Contenu du dépôt

| Dossier | Rôle |
|---|---|
| `site/` | Le site publié par Cloudflare Pages. `site/index.html` = site client (tout est dans ce fichier), `site/pro/` = **espace équipe** (application de gestion des demandes, non indexée). |
| `supabase/migrations/` | Historique de la base PostgreSQL (Supabase), dans l'ordre. **Toute modification de la base passe par un nouveau fichier ici.** |
| `workers/email-entrant/` | Cloudflare Email Worker : reçoit les e-mails transférés et les dépose dans Supabase (voir son README). |
| `supabase/test/` | Requêtes d'exemple et script de test local (ne jamais lancer `99_test_local.sql` sur Supabase). |

## Ce qui fonctionne vraiment

- **Demandes de réservation** pour toutes les offres et pour les voyages sur-mesure : enregistrées dans Supabase (table `quote_requests`), avec un bouton « Envoyer aussi sur WhatsApp » et un lien e-mail. Si la base ne répond pas, le visiteur voit directement les boutons WhatsApp et e-mail : la demande n'est pas perdue.
- Anti-spam simple : champ piège invisible + délai minimum de 4 secondes.
- **Aucun paiement en ligne** : les prix sont indicatifs, l'agence confirme par écrit.
- Pages **Privacy & Cookies** et **Note legali** (anglais + italien), à faire relire par un professionnel.
- Référencement : description, image d'aperçu pour WhatsApp/Facebook (`og-image.jpg`, photo CC0), icône, `robots.txt`, `sitemap.xml`, fiche « agence de voyage » pour Google générée depuis `CONFIG`.

## Espace équipe : https://turismoclub.it/pro/

**Se connecter :** e-mail + mot de passe (option : recevoir un lien de connexion par e-mail). Premier compte admin : mraihiriadh@turismoclub.it. Changer son mot de passe : menu **Mon mot de passe** (12 caractères minimum).

**Traiter une demande :**
1. Les demandes du site arrivent en direct dans la colonne **Nouvelles** (compteur dans le menu ; ancienneté en rouge au-delà de 12 h).
2. Ouvrir la fiche : répondre par **WhatsApp** (message pré-rempli dans la langue du client) ou **e-mail**, ajuster les **prestations** et les montants, choisir le **responsable**.
3. Passer l'**étape** : En cours → Devis envoyé → Confirmée (puis Terminée, ou Annulée). Enregistrer les **acomptes** reçus (espèces, virement, carte sur place). Tout est tracé dans l'**historique**.

Une demande reçue par téléphone, WhatsApp ou à l'agence se saisit avec **+ Nouvelle demande**.

**Tableau de bord** (page d'accueil de l'espace) : nouvelles demandes (et celles en attente depuis plus de 12 h), réservations confirmées du mois, encaissé du mois et reste à encaisser, liste « À traiter maintenant », origine des demandes sur 30 jours. Tout est calculé sur les vraies données ; sans données, la page l'indique.

**Langue de l'interface** : français ou italien (menu en bas à gauche, gardé sur l'appareil).

**Planning** : semaine en 7 colonnes (précédente / aujourd'hui / suivante), chaque départ avec heure, offre, remplissage (ex. 3/15, « Complet »), guide ; alertes « Guide à attribuer » et « Minimum non atteint » ; couleurs par type. Clic sur un départ : participants, guide (alerte si chevauchement ou guide indisponible), capacité, langue, billets, état. Bouton « + Créer un départ ». Une prestation d'un dossier (offre + date + heure) est rattachée automatiquement au départ correspondant.

**Guides** : liste, langues, départs de la semaine, chevauchements, jours indiqués non disponibles ; l'admin ajoute et modifie les guides. Pour qu'un guide se connecte : créer son compte dans Supabase, puis dans `staff` mettre `role = guide` et `guide_id` = son numéro de guide.

**Vue guide** (téléphone) : un guide arrive sur « Ma journée » (ses départs, rendez-vous + Google Maps, langue, billets, participants à cocher à l'arrivée avec le compteur « 3 / 15 arrivés », notes utiles), puis onglets Semaine et Disponibilités. Il ne voit ni montants ni coordonnées des clients.

**E-mails** : les e-mails que Gmail transfère à **demandes@in.turismoclub.it** arrivent en direct dans la rubrique E-mails (compteur dans le menu). Pour chaque e-mail : lire, **Créer une demande** (formulaire pré-rempli : nom, e-mail, téléphone, offre, date, personnes, langue), **Lier à une demande existante**, **Répondre dans Gmail**, marquer traité ou ignorer. Chemin : Gmail → transfert → Cloudflare Email Routing (sous-domaine `in.`, les MX Google de turismoclub.it ne changent pas) → Worker `workers/email-entrant` → Supabase `inbound_emails`.

**Boîte mail** (menu) ouvre Gmail dans un nouvel onglet. Dans « + Nouvelle demande », **Coller un e-mail** pré-remplit le formulaire à partir d'un e-mail copié depuis Gmail (règles simples, pas d'IA ; ce qui n'est pas trouvé reste vide).

Le menu montre encore une rubrique marquée **Bientôt** : le paiement en ligne (Stripe), qui demande un compte Stripe au nom de l'agence.

**Ajouter un membre de l'équipe** (réservé à l'administrateur, dans Supabase) :
1. Tableau de bord Supabase → *Authentication* → *Users* → **Add user** → *Create new user* : son e-mail + un mot de passe provisoire, cocher *Auto Confirm User*.
2. *Table Editor* → table **`staff`** → *Insert row* : `id` = l'identifiant (UID) de l'utilisateur créé à l'étape 1, `email`, `full_name`, `role` (`admin`, `conseiller` ou `guide` ; un guide doit aussi avoir un `guide_id`).
3. La personne se connecte sur https://turismoclub.it/pro/ puis change son mot de passe (menu *Mon mot de passe*). Pour retirer un accès : mettre `is_active` à `false`.

**Ce que chacun voit** (appliqué par la base, pas seulement par l'écran) :
| Rôle | Accès |
|---|---|
| `admin` | Tout, y compris annuler un paiement et gérer l'équipe. |
| `conseiller` | Demandes, prestations, clients, paiements (ajout), historique. Pas la gestion de l'équipe ni la suppression de paiements. |
| `guide` | Vue guide uniquement : ses départs, ses participants (prénom, nombre, langue, notes), le pointage et ses disponibilités. Ni montants, ni coordonnées, ni autres départs (vérifié par la base). |
| autre compte connecté | « Accès non autorisé ». |

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
- Les vrais guides (noms, langues) et la validation des créneaux du planning (générés à partir des horaires du site, du 19/11 au 19/12/2026).
- Règle de transfert Gmail vers demandes@in.turismoclub.it (à créer par l'admin) ; paiement Stripe.
- Relecture des traductions par des natifs (chinois, japonais, coréen en priorité).
