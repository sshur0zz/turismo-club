# Mesures de référence (avant optimisation) — Turismo Club

- **Date** : 24/11/2026 · **Commit** : `300ec42` · **Auteur** : agent Q1
- **Où** : copie locale du site (`python3 -m http.server 8765` dans `site/`), Chromium 1194 (Playwright 1.56.1), 1280 × 900, sans limitation réseau.
  Les seuls appels à la production sont les **lectures publiques** du catalogue (`site_offers`), identiques à celles d'un visiteur.
- **Méthode** : 7 chargements à froid par parcours (nouveau contexte navigateur à chaque fois). Temps = navigation → élément principal visible.
  Poids = corps + en-têtes de toutes les réponses jusqu'au repos réseau (photos Wikimedia comprises).
- Script : `mesures.mjs` (hors dépôt, dossier de travail de la session).

| Parcours | p50 (ms) | p95 (ms) | Requêtes | Requêtes base | Poids transféré |
|---|---|---|---|---|---|
| Accueil | 105 | 171 | 14 | 1 | 3,8 Mo |
| Catalogue | 100 | 133 | 15 | 1 | 3,8 Mo |
| Fiche offre (Vatican) | 107 | 114 | 7 | 1 | 1,1 Mo |
| Voyage sur-mesure | 98 | 117 | 4 | 1 | 0,24 Mo |
| Espace équipe (connexion) | 112 | 125 | 19 | 0 | 0,21 Mo |

Taille du code : `site/index.html` 212 Ko (3 178 lignes de JS au total avec l'espace équipe) ; `site/pro/` 155 Ko répartis en 16 fichiers.

## Lecture
- Le temps d'affichage est bon partout (≈ 0,1 s en local). Le temps réel en ligne dépend surtout du réseau.
- **Le poids vient presque entièrement des photos** : 3,8 Mo sur l'accueil et le catalogue, parce que chaque carte charge une photo en 1 280 px
  alors qu'elle est affichée en ≈ 300 px. Sur mobile en 4G, c'est le premier levier d'optimisation (voir `dette.md`, Q-01).
- Une seule requête à la base par page publique : pas de problème N+1.
- L'espace équipe connecté (tableau de bord, demandes, planning) n'a pas été mesuré : il faut un compte de test, donc des écritures
  dans la base de production. À faire sur la copie locale (O3) ou avec ton accord.
