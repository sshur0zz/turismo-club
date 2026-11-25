# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visiteurs du site public (principal)** : touristes étrangers, surtout anglophones, souvent sur téléphone, qui préparent ou vivent leur séjour à Rome. Ils choisissent une visite, un bus, un circuit, un hôtel ou un restaurant, puis envoient une demande de réservation ou de voyage sur-mesure. *(Confirmé par Selim le 25/11/2026.)*
- **Équipe de l'agence (espace `/pro/`)** : admin, conseillers et guides. Ils traitent les demandes (WhatsApp, e-mail), suivent le planning des départs, les guides, les clients, les fournisseurs, la flotte et les locations. Les guides l'utilisent sur téléphone (« Ma journée »). Interface en français ou en italien.

## Product Purpose

Turismo Club est une agence de voyage locale basée à Rome. Le site public présente ses offres et collecte des demandes. L'agence confirme chaque demande par écrit. L'espace équipe sert à traiter ces demandes jusqu'à la réalisation de la prestation.

Le site réussit quand un visiteur trouve une offre qui lui plaît et envoie une demande complète. L'espace équipe réussit quand aucune demande n'est oubliée (alerte au-delà de 12 h) et qu'on voit d'un coup d'œil qui fait quoi et quand.

## Positioning

Il s'agit d'une vraie agence locale à Rome, joignable directement par WhatsApp. Elle confirme chaque demande elle-même : ce n'est pas une place de marché, et il n'y a pas de paiement automatique.

## Operating Context

- Parcours public : accueil → catalogue → fiche → demande (créneau, personnes, langue) → confirmation, avec la possibilité d'envoyer aussi la demande par WhatsApp ou par e-mail. Il existe aussi un formulaire de voyage sur-mesure.
- Les demandes arrivent dans Supabase (`quote_requests`) et une notification part par e-mail vers l'agence.
- Espace équipe : tableau de bord, Kanban des demandes, planning de la semaine, guides, clients, hôtels, fournisseurs, flotte, locations, e-mails entrants.

## Capabilities and Constraints

- Site statique publié par Cloudflare Pages (push sur `main` = mise en ligne). Pas de framework ni d'étape de build, aucune dépendance externe. Le site public tient dans `site/index.html`. L'espace équipe est dans `site/pro/` (index.html + modules JS).
- 10 langues sur le site public (en, it, fr, es, de, pt, nl, zh, ja, ko). Chaque texte passe par `tr()` et doit exister dans les 10 langues.
- Aucun paiement en ligne pour l'instant : les prix sont indicatifs. Stripe est prévu plus tard.
- Catégories : `activity`, `bus`, `circuit` (avec créneaux), `hotel` et `restaurant` (simple demande).
- Accessibilité : vrais boutons, liens et labels ; cibles d'au moins 44 px ; contraste d'au moins 4,5:1. Toute saisie de l'utilisateur est échappée avec `esc()`.
- Les essais de style se font sur la branche `essais-style`, jamais directement sur `main`.

## Brand Commitments

- Nom : **Turismo Club** (raison sociale : Turismo Club di Riadh Mraihi).
- Logo **« L'Arche »**, un SVG généré dans le code : il est conservé.
- Couleurs, typographie et mise en page sont **ouvertes** pour la refonte (décision de Selim du 25/11/2026). L'ancienne palette Bordeaux & or n'est plus imposée.

## Evidence on Hand

- Photos sous licence libre (Wikimedia Commons, CC0), créditées sur la page `#credits`. Image d'aperçu : `site/og-image.jpg`.
- Coordonnées réelles dans `CONFIG` : WhatsApp, e-mail, P.IVA. Pas encore fournis : l'adresse exacte du siège, le numéro REA et les horaires.
- **Absents, à ne pas inventer** : avis clients, notes, chiffres de l'accueil, vrais guides, noms des hôtels et restaurants partenaires, prix validés et conditions d'annulation. Le bandeau « version de prévisualisation » reste tant que ces informations ne sont pas réelles.

## Product Principles

1. Une vraie agence de Rome : tout ce qui est affiché doit être vrai, rien n'est inventé.
2. La demande est le geste principal. La rendre simple sur téléphone, dans la langue du visiteur.
3. Le contact humain direct (WhatsApp, e-mail) est toujours à portée de main.
4. Pour l'équipe, la clarté passe avant l'effet : on doit voir les demandes en retard, le planning et les responsabilités sans chercher.

## Accessibility & Inclusion

Contraste d'au moins 4,5:1, cibles d'au moins 44 px, éléments HTML natifs et `aria-label` sur les boutons-icônes. Visiteurs de 10 langues, dont le chinois, le japonais et le coréen : la typographie doit les afficher correctement.
