# Dette technique — Turismo Club

- **Date** : 24/11/2026 · **Commit** : `300ec42` · **Auteur** : agent Q1
- Classement : impact × effort (I = impact, E = effort ; S/M/L). Aucun correctif n'est appliqué sans validation.

| ID | Constat | Preuve | I | E | Proposition |
|---|---|---|---|---|---|
| Q-01 | Photos des cartes chargées en 1 280 px | `site/index.html` : `photoUrl(p)` utilise `p.w` (1280) ; 3,8 Mo sur l'accueil | Élevé | S | Vignettes Wikimedia en 640 px pour les cartes, 1 280 px seulement en tête de fiche |
| Q-02 | Aucun test automatique ni CI dans le dépôt | les tests Playwright de la session sont hors dépôt | Élevé | M | Ranger les tests dans `tests/` (site, espace équipe, e-mails) + script de CI locale ; garde anti-secrets et anti-codage en dur |
| Q-03 | Offres en double : `ACTIVITIES` (code) et `activities` (base) | titres, résumés et prix existent aux deux endroits ; seuls les prix sont relus depuis la base (`syncFromDb`) | Élevé | L | Faire de la base la seule source (titres, détails, photos), le code ne gardant que l'affichage |
| Q-04 | Traductions empilées en couches (`UI`, `UI2`, `UI3`, `UI4`) | `site/index.html` | Moyen | M | Fusionner en un seul dictionnaire, test de parité des clés sur les 10 langues |
| Q-05 | Montants en nombres flottants côté site public | `adult: 19.9`, `eur(n)` | Moyen | S | Prix en centimes entiers partout (la base est déjà en centimes `integer`) ; affichage seul en euros |
| Q-06 | Code mort | panier (`state.cart`, `updateCartCount`), offre `colisee-souterrains` non publiée, styles `.demo` et `.topbar` | Faible | S | Supprimer |
| Q-07 | `CLAUDE.md` en partie dépassé | « IT à ajouter » (fait), « le patron voit les demandes dans Table Editor » (remplacé par l'espace équipe) | Faible | S | Mettre à jour |
| Q-08 | Gestion d'erreurs silencieuse | `syncFromDb` : `catch (e) {}` | Faible | S | Journal console + indicateur discret « prix non à jour » |
| Q-09 | Polices Google chargées depuis un service tiers | `fonts.googleapis.com` | Faible | S | Héberger la police (RGPD, vitesse) |
| Q-10 | Fichier unique de 212 Ko pour le site public | `site/index.html` | Faible | L | Acceptable tant qu'il n'y a pas d'étape de build ; à revoir seulement si le site grossit encore |
