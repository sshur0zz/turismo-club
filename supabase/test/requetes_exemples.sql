-- =====================================================================
-- Turismo Club — requêtes utilisées par les pages du site
-- Les $1, $2… sont les paramètres envoyés par le code du site.
-- =====================================================================

-- ACCUEIL · « Les plus réservées à Rome » (4 cartes)
SELECT slug, title, duration_minutes, price_adult_cents, badge, rating_avg, review_count
FROM activity_cards
WHERE destination_slug = 'rome'
ORDER BY bookings_count DESC, title
LIMIT 4;

-- ACCUEIL · « Rome selon vos envies » (tuiles + nombre d'activités)
SELECT c.slug, c.name, count(ac.activity_id) AS nb_activites
FROM categories c
LEFT JOIN activity_categories ac ON ac.category_id = c.id
LEFT JOIN activities a ON a.id = ac.activity_id AND a.is_published
GROUP BY c.id
ORDER BY c.position;

-- CATALOGUE · filtres « envie » + durée max + tri par prix
--   $1 = tableau de slugs d'envies (ex. '{rome-antique}'), $2 = durée max en minutes
PREPARE catalogue(text[], int) AS
SELECT ac.slug, ac.title, ac.duration_minutes, ac.price_adult_cents, ac.rating_avg, ac.review_count
FROM activity_cards ac
WHERE ac.destination_slug = 'rome'
  AND ($2 IS NULL OR ac.duration_minutes <= $2)
  AND (cardinality($1) = 0 OR EXISTS (
        SELECT 1 FROM activity_categories x
        JOIN categories c ON c.id = x.category_id
        WHERE x.activity_id = ac.id AND c.slug = ANY ($1)))
ORDER BY ac.price_adult_cents;

EXECUTE catalogue('{rome-antique}', 240);

-- FICHE ACTIVITÉ · contenu + programme
SELECT a.*, d.name AS destination
FROM activities a JOIN destinations d ON d.id = a.destination_id
WHERE a.slug = 'colisee-forum-palatin' AND a.is_published;

SELECT s.position, s.title, s.description, s.duration_minutes
FROM activity_steps s JOIN activities a ON a.id = s.activity_id
WHERE a.slug = 'colisee-forum-palatin'
ORDER BY s.position;

-- FICHE ACTIVITÉ · créneaux disponibles pour une date choisie (heure de Rome)
SELECT to_char(starts_at AT TIME ZONE 'Europe/Rome', 'HH24:MI') AS heure, seats_left
FROM departure_availability da
JOIN activities a ON a.id = da.activity_id
WHERE a.slug = 'colisee-forum-palatin'
  AND (starts_at AT TIME ZONE 'Europe/Rome')::date = current_date + 1
  AND seats_left > 0
ORDER BY starts_at;

-- FICHE ACTIVITÉ · calcul du total (le serveur recalcule, ne jamais faire
-- confiance au total envoyé par le navigateur)
SELECT 2 * price_adult_cents + 1 * coalesce(price_child_cents, price_adult_cents) AS total_cents
FROM activities WHERE slug = 'colisee-forum-palatin';

-- ADMIN · devis à traiter
SELECT id, first_name, email, date_from, travelers, budget_cents, created_at
FROM quote_requests
WHERE status = 'new'
ORDER BY created_at;

-- ADMIN · chiffre d'affaires confirmé par activité ce mois-ci
SELECT a.title, count(*) AS reservations, round(sum(b.total_cents) / 100.0, 2) AS ca_euros
FROM bookings b
JOIN departures dp ON dp.id = b.departure_id
JOIN activities a  ON a.id = dp.activity_id
WHERE b.status = 'confirmed'
  AND b.created_at >= date_trunc('month', now())
GROUP BY a.title
ORDER BY ca_euros DESC;
