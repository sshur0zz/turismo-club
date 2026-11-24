# Matrice des écarts — Turismo Club

- **Date** : 24/11/2026 · **Auteur** : agent A0 · **Commit** : `300ec42`
- Pour chaque fonction du back-office de référence : ce projet l'a-t-il déjà ? (**oui / partiel / non**, avec fichiers et tables), et la proposition :
  **garder** (on ne touche pas) · **compléter** (on ajoute ce qui manque à l'existant, sans le casser) · **ajouter** (nouveau module, sur les tables existantes) · **hors périmètre**.
- Règle : rien n'est codé avant la validation de Selim **ligne par ligne** (colonne « Décision »).
- Taille : S (≤ 1 jour), M (2–4 jours), L (≥ 1 semaine).

## A. Fonctions demandées en priorité

| # | Fonction de référence | Ici | Où (fichiers / tables) | Écart | Proposition | Taille | Décision |
|---|---|---|---|---|---|---|---|
| 1 | **Clients** : fiche personne, coordonnées, historique | partiel | `customers` ; `site/pro/views/dossier.js` (client rattaché à la demande, retrouvé par e-mail ou téléphone) | pas de page « Clients » (liste, recherche, fiche avec toutes ses demandes) ; pas d'organisations | **compléter** : page Clients sur la table `customers` existante | M | |
| 2 | Clients : doublons et fusion historisée | non | – | aucune détection | **ajouter** (sur `customers`) | M | |
| 3 | Clients : téléphone normalisé international (E.164) | non | `customers.phone` texte libre | formats mélangés | **compléter** (normalisation à l'enregistrement, sans réécrire l'existant) | S | |
| 4 | Clients : activités, tâches avec échéance, « mes tâches » | non | notes internes seulement (`quote_requests.internal_note`, `booking_events`) | pas de tâches ni de rappels | **ajouter** | M | |
| 5 | Clients : consentements horodatés et versionnés | partiel | `quote_requests.consent_at` | pas de version du texte accepté ni d'historique par client | **compléter** | S | |
| 6 | **Pipeline Kanban** des demandes | partiel | `site/pro/views/demandes.js` (colonnes Nouvelles → En cours → Devis envoyé → Confirmée → Terminée / Annulée, changement d'étape au clavier par liste) ; historique `booking_events` | pas de glisser-déposer ; étapes non paramétrables ; **pas de motif de perte obligatoire** ; pas de budget sur la carte | **garder** l'existant + **compléter** : glisser-déposer (en plus de la liste clavier), motif de perte obligatoire | M | |
| 7 | Demandes structurées par type (location, voiture avec chauffeur, billet, séjour, hôtel…) + « créer la réservation » | partiel | type déduit de l'offre (`activities.type`), sur-mesure via `#devis` | pas de formulaire spécifique par type | **compléter** au fil des modules 10–14 | M | |
| 8 | **Réservations** de places sur départs, sans survente | oui | `departures`, `bookings`, `request_items.departure_id`, trigger `check_departure_capacity`, `site/pro/views/planning.js` | pas de test de concurrence | **garder** + ajouter le test de concurrence (T1) | S | |
| 9 | Dossiers voyage : prestations, statuts fournisseur, référence obligatoire, vouchers | partiel | `quote_requests` = dossier, `request_items` = prestations, `payments` | pas de statut fournisseur (demandée → option → confirmée avec référence → émise) ; pas de voucher | **compléter** (colonnes sur `request_items`, voucher imprimable sans prix) | M | |
| 10 | **Fournisseurs** (hôtels, transporteurs, loueurs, réceptifs) | non | – | aucun annuaire ; prérequis des hôtels | **ajouter** | S | |
| 11 | **Hôtels** : fiches, chambres, saisons, grille coût → marge → prix, enfants par âge, allotements, TVA saisie | non | les « hôtels » du site sont 2 offres génériques (`activities.type = 'hotel'`) | tout le module | **ajouter** ; calcul de prix porté depuis le code de référence (**code à fournir**) ; coûts et marges jamais côté navigateur | L | |
| 12 | Recherche d'hôtels publique | non | – | – | **ajouter** après 11 (vitrine existante) | M | |
| 13 | **Flotte** : véhicules, photos, documents et échéances, entretiens, kilométrage | non | – | tout le module | **ajouter** — *à confirmer : l'agence loue-t-elle des véhicules ?* | L | |
| 14 | **Locations** : contrats sans chevauchement, options, lieux, formules, permis | non | – (seul « Transferts privés » existe, comme offre) | tout le module | **ajouter** après 13 | L | |
| 15 | **États des lieux et dégâts** : schéma à zones, photos, signature, figé après signature, comparaison départ/retour | non | – | tout le module ; demande un stockage de photos (Supabase Storage : quota gratuit 1 Go, **décision coût si dépassement**) | **ajouter** après 14 | L | |
| 16 | Module « sinistre » complet (assureur, franchise, expertise) | non | – | n'existe pas non plus dans la référence | **hors périmètre** sauf décision (juridique / contractuelle) | – | |
| 17 | **Bibliothèque d'icônes** (codes stables, libellés multilingues, sélecteur) | non | icônes SVG dessinées à la main dans `site/index.html` | pas de référentiel | **ajouter** (référentiel en JS + codes en base), licence MIT à mentionner | S | |

## B. Fonctions transverses et socle

| # | Fonction de référence | Ici | Où | Écart | Proposition | Taille | Décision |
|---|---|---|---|---|---|---|---|
| 18 | Isolation multi-organisation (`tenant_id` + RLS) | non (une seule agence) | RLS par rôle sur toutes les tables | pas de notion d'organisation | **hors périmètre** (une seule agence ; RLS par rôle déjà en place) | – | |
| 19 | Rôles et permissions côté serveur, hors portée = invisible | oui | `staff.role` (admin, conseiller, guide), `private.current_staff_role()`, 47 politiques | rôles plus simples que la référence | **garder** | – | |
| 20 | Journal d'audit en ajout seul | oui | `audit_log`, `write_audit()` | – | **garder** | – | |
| 21 | Montants décimaux, jamais de flottant | partiel | base en centimes `integer` ✅ ; site public : prix en euros flottants (`adult: 19.9`) | affichage seulement, mais contraire à la règle | **compléter** : centimes partout (dette Q-05) | S | |
| 22 | Navigation par groupes, menu mobile | partiel | `site/pro/views/common.js` (menu latéral) | pas de groupes (vente / production / finance / pilotage) | **compléter** quand les nouveaux modules arrivent | S | |
| 23 | Recherche globale (Ctrl+K) | non | recherche par page (demandes, e-mails) | – | **ajouter** après les modules | M | |
| 24 | Formulaire public (pot de miel, délai, limitation, consentement) | partiel | `site/index.html` (pot de miel + 4 s + consentement) | **pas de limitation de débit** (SEC-003) | **compléter** (lot sécurité) | S | |
| 25 | Traductions avec test de parité | partiel | site 10 langues ; espace équipe FR + IT | pas de test de parité ; pas d'arabe ni d'anglais dans l'espace équipe | **compléter** (test de parité) ; AR/EN : **hors périmètre** sauf demande | S | |
| 26 | Analyses (ventes, pipeline, remplissage) | partiel | `site/pro/views/tableau.js` (données réelles) | pas de remplissage de flotte ni d'hôtels | **garder** + compléter avec les modules | S | |
| 27 | Administration : membres, invitations | partiel | `staff`, `site/pro/views/guides.js` | pas d'écran d'invitation des membres | **compléter** | S | |

## C. Fonctions de la référence non demandées

| # | Fonction | Ici | Proposition |
|---|---|---|---|
| 28 | Devis (1 à 3 options, signature en ligne), contrat de voyage | non (statut « devis envoyé » seulement) | **hors périmètre** pour l'instant (aspects juridiques) |
| 29 | Factures, avoirs, numérotation sans trou | non (paiements manuels seulement, `payments`) | **hors périmètre** (fiscal : facturation électronique italienne) |
| 30 | Commissions | non | **hors périmètre** |
| 31 | CMS (pages du site par blocs) | non (site écrit dans le code) | **hors périmètre** |
| 32 | Portail voyageur / espace client | non | **hors périmètre** |
| 33 | Programmes : tarifs bébé, itinéraire GPS | partiel (`activities`, `activity_steps`, tarifs adulte/enfant) | **hors périmètre** pour l'instant |

## Ce qui existe ici et pas dans la référence (à garder tel quel)
Réception des e-mails dans l'espace équipe (`inbound_emails`, Worker), notification « nouvelle demande », « Coller un e-mail »,
vue guide (jour / semaine / disponibilités), site public en 10 langues avec best-sellers.

## Ordre de lots proposé (après validation)
0. **Lot sécurité** (S1-12) : limite de débit des demandes, CSP + HSTS, MFA admin — *petit, recommandé avant tout*.
1. Clients (1, 3, 5) + Kanban complété (6) + icônes (17).
2. Fournisseurs (10) + Hôtels (11, puis 12) — *code de référence nécessaire*.
3. Dossiers complétés (9) + tâches (4) + doublons (2).
4. Flotte (13) → Locations (14) → États des lieux et dégâts (15) — *si l'agence loue des véhicules*.
5. Recherche globale (23), navigation par groupes (22), invitations (27).
