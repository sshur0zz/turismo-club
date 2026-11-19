# Turismo Club v2 — Architecture du portail sur-mesure

> Document de référence de la refonte. Tous les agents IA le lisent avant de travailler.
> Statut : **brouillon phase 0**, à valider par Selim.

## 1. Principe : un « mini-WordPress » taillé pour une agence de voyage

Le portail a trois portes d'entrée et un seul cerveau :

```
  Visiteur ──► Site public  (/ , /offres, /rubrique/…)  ─┐
  Client   ──► Espace client (/compte)                   ├──► Supabase (base + connexion + fichiers)
  Employé  ──► Back-office   (/admin)                    ─┘        ▲
                                                                   │
                         Plugins (Stripe, e-mails, avis…) ─────────┘
```

Tout ce que l'agence doit pouvoir changer seule se gère **dans le back-office et vit dans la base**, jamais dans le code :
offres, prix, rubriques, pages, menus, photos, traductions, réglages, plugins activés.

## 2. Les 4 briques « dynamiques »

### 2.1 Types d'offres (ce qu'on vend)
Aujourd'hui : 5 catégories figées (activité, bus, circuit, hôtel, restaurant).
Demain : table `offer_types`, gérée dans l'admin. Chaque type définit :
- son **mode de vente** : `paiement` (créneau + panier + Stripe), `demande` (devis), `info` (simple fiche) ;
- ses **champs en plus** (ex. « transfert aéroport » → terminal, nombre de bagages), décrits en JSON.

Ajouter « Transfert aéroport » ou « Cours de cuisine » = 2 minutes dans l'admin, sans développeur.
Les tables solides (`offers`, `departures`, `bookings`, `payments`) restent typées en SQL : l'argent et les places ne se gèrent pas en JSON.

### 2.2 Rubriques (le contenu éditorial)
Une **rubrique** = une collection de contenus du même genre, créée dans l'admin :
« Blog », « Guides de Rome », « FAQ », « Partenaires », « Événements »…
- Table `collections` : nom, slug, icône, liste des champs (texte traduit, image, date, lien, liste, relation vers une offre…).
- Table `entries` : les éléments de la rubrique (`data jsonb`, statut brouillon/publié, date de publication).
- Le site public génère automatiquement `/rubrique/<slug>` et `/rubrique/<slug>/<élément>`.

### 2.3 Pages et blocs (le « constructeur de pages »)
Une page = une liste ordonnée de **blocs** qu'on empile depuis l'admin (glisser-déposer) :
`Bandeau d'accueil`, `Texte`, `Galerie`, `Grille d'offres` (filtrée par type/destination), `Liste d'une rubrique`,
`Avis`, `FAQ`, `Carte`, `Formulaire de contact`, `Appel à l'action`.
- Table `pages` (slug, titre traduit, `blocks jsonb`, SEO, statut) + table `menus` (en-tête, pied de page).
- Chaque type de bloc = un composant dans le code (`src/lib/blocks/`). Un plugin peut en ajouter.

### 2.4 Plugins (les extensions)
Un plugin = un dossier `src/plugins/<nom>/` avec une fiche `plugin.ts` :

```ts
export default definePlugin({
  key: 'stripe',
  name: 'Paiement Stripe',
  version: '1.0.0',
  settings: { /* champs de réglage affichés dans l'admin */ },
  hooks:    { 'booking.created': …, 'booking.cancelled': … },  // réagit aux événements
  blocks:   [ /* blocs de page en plus */ ],
  adminPages: [ /* écrans d'admin en plus */ ],
  migrations: [ /* tables SQL propres au plugin */ ],
});
```

- Table `plugins` : `key`, `enabled`, `settings jsonb`. L'admin **active / désactive / règle** chaque plugin.
- Les **secrets** (clé Stripe, clé e-mail) ne vont jamais dans `settings` : ils restent dans les secrets Supabase/Cloudflare.
- **Différence avec WordPress (volontaire)** : on ne télécharge pas de plugin depuis Internet. Un nouveau plugin
  est ajouté au code par un agent, testé sur une branche, puis activé dans l'admin. C'est plus sûr :
  les plugins tiers sont la 1ʳᵉ cause de piratage des sites WordPress.

Événements disponibles pour les plugins (liste à compléter) :
`booking.created`, `booking.confirmed`, `booking.cancelled`, `payment.succeeded`, `payment.refunded`,
`quote.created`, `customer.registered`, `review.submitted`, `entry.published`.
Ils passent par une table `events` (file d'attente) traitée côté serveur → un plugin en panne ne bloque pas une réservation.

Plugins prévus : Stripe · E-mails transactionnels · Turnstile (anti-spam) · WhatsApp · Avis clients ·
Codes promo · Chèques cadeaux · Newsletter · Statistiques (Cloudflare Web Analytics) · Export comptable.

## 3. Comptes et profils

- **Une seule connexion** (Supabase Auth : e-mail + lien magique, Google en option) pour clients et employés.
- `customers.user_id → auth.users` : le client voit et modifie **uniquement** son profil et ses réservations (RLS).
- `staff.user_id → auth.users` : rôles `admin`, `conseiller`, `guide` (existants), + permissions fines par module.
- Côté admin, la **fiche client** regroupe : profil, langue, historique, paiements, messages, notes internes, consentements.
- Messagerie client ↔ agence : tables `conversations` / `messages`.
- RGPD : export des données et suppression du compte depuis `/compte`.

## 4. Choix techniques

| Besoin | Choix | Pourquoi |
|---|---|---|
| Application (public + compte + admin) | **SvelteKit** | Simple à lire, rapide, multilingue, fonctionne sur Cloudflare |
| Hébergement | **Cloudflare Pages** (déjà en place) | Gratuit, mise en ligne au `git push` |
| Base, connexion, fichiers | **Supabase** (déjà en place) | PostgreSQL + RLS + Auth + Storage |
| Paiement | **Stripe** (plugin) | Standard, mode test gratuit |
| Langues | Textes d'interface en fichiers ; contenus traduits en base (`jsonb` par langue) | L'agence traduit ses offres dans l'admin |

Conséquence : on abandonne la règle « un seul fichier HTML ». Le site actuel (`site/`) reste en ligne
jusqu'à ce que la v2 le remplace en phase 6. Il faut **Node.js** sur le Mac.

## 5. Arborescence cible

```
app/                     Application SvelteKit
  src/routes/            (public)/…  compte/…  admin/…  api/…
  src/lib/blocks/        Blocs de page
  src/lib/i18n/          Textes d'interface (10 langues)
  src/lib/server/        Logique serveur (prix, places, événements)
  src/plugins/<nom>/     Un dossier par plugin
supabase/migrations/     Base (on continue l'historique existant)
docs/                    Ce document, maquettes, décisions
site/                    Ancien site, conservé jusqu'au basculement
```

## 6. Phases

| Phase | Livrable | Test de validation par Selim |
|---|---|---|
| 0. Préparation | Ce document, modèle de données v2, liste des écrans, agents créés | Relire et valider |
| 1. Fondations | Projet SvelteKit, design Bordeaux & or, 10 langues, connexion client/employé, rôles | Se connecter en client et en admin |
| 2. Moteur de contenu | Types d'offres, rubriques, pages à blocs, menus, médias, traductions, réglages | Créer une rubrique « Blog » et une page sans code |
| 3. Réservations | Créneaux, capacités, panier, devis, e-mails, gestion admin, planning guides | Réserver côté site → voir la réservation dans l'admin |
| 4. Espace client | Profil, mes réservations, annulation, messages, RGPD | Un client modifie son profil et écrit à l'agence |
| 5. Plugins & paiement | Système de plugins + Stripe, e-mails, Turnstile, codes promo | Payer en mode test, rembourser depuis l'admin |
| 6. Lancement | Contenus réels, pages légales, domaine, traductions relues, tests complets, formation | Bandeau « demo » retiré |

## 7. Agents IA

| Agent | Périmètre (dossiers) | Phases |
|---|---|---|
| Architecte | `docs/`, relecture de tout | 0, puis chaque fin de phase |
| Base de données | `supabase/` | 1 → 5 |
| Site public | `app/src/routes/(public)`, `app/src/lib/blocks` | 1 → 3 |
| Back-office | `app/src/routes/admin` | 2 → 5 |
| Espace client | `app/src/routes/compte` | 4 |
| Intégrations & plugins | `app/src/plugins`, `app/src/lib/server` | 3, 5 |
| Traduction & contenu | `app/src/lib/i18n`, contenus en base | 2, 6 |
| Qualité & sécurité | lecture seule + tests | fin de chaque phase |

Règle : un agent ne modifie que son périmètre. Chaque phase = une branche → prévisualisation `*.pages.dev` → validation → fusion dans `main`.

## 8. Décisions (19/11/2026)

1. **Utilisateur du back-office** : le chef d'entreprise seul pour l'instant (rôle `admin`). Les rôles `conseiller` et `guide` restent prêts pour plus tard.
2. **Réserver sans compte** : oui. Le compte client est créé automatiquement à la première réservation (même e-mail = même client) ; il pourra s'y connecter par lien magique.
3. **Accès partenaires** (hôtels/restaurants) : reporté, à rediscuter après la phase 6.
