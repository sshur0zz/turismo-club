-- =====================================================================
-- Turismo Club — données de démonstration
-- ATTENTION : prix, capacités et horaires sont des EXEMPLES à remplacer
-- par les vrais chiffres de l'agence. Aucun avis n'est inséré :
-- les avis doivent venir de vrais clients.
-- =====================================================================

BEGIN;

INSERT INTO destinations (slug, name, is_day_trip) VALUES
  ('rome',             'Rome',               false),
  ('pompei-naples',    'Pompéi & Naples',    true),
  ('florence',         'Florence',           true),
  ('toscane',          'Toscane',            true),
  ('cote-amalfitaine', 'Côte amalfitaine',   true);

INSERT INTO categories (slug, name, position) VALUES
  ('rome-antique',      'Rome antique',             1),
  ('vatican-art',       'Vatican & art',            2),
  ('gastronomie',       'Gastronomie',              3),
  ('famille',           'En famille',               4),
  ('rome-by-night',     'Rome by night',            5),
  ('hors-sentiers',     'Hors des sentiers battus', 6),
  ('excursions',        'Excursions à la journée',  7);

INSERT INTO guides (first_name, languages) VALUES
  ('[Guide 1]', '{fr,it}'),
  ('[Guide 2]', '{fr,en,it}');

INSERT INTO activities
  (slug, destination_id, title, summary, duration_minutes, format, max_group_size,
   price_adult_cents, price_child_cents, child_min_age, highlights, included, not_included,
   important_info, meeting_point, meeting_lat, meeting_lng, badge, is_published)
VALUES
  ('colisee-forum-palatin', 1,
   'Colisée, Forum romain & Palatin avec accès à l''arène',
   'Entrée coupe-file, accès à l''arène et 2 000 ans d''histoire.',
   180, 'small_group', 15, 6900, 4900, 6,
   '{"Entrée coupe-file","Descente dans l''arène","Forum romain et Palatin","Guide romain francophone"}',
   '{"Billets d''entrée coupe-file","Guide francophone","Écouteurs"}',
   '{"Pourboires","Transport jusqu''au point de rendez-vous"}',
   'Pièce d''identité obligatoire. Chaussures confortables.',
   'Arc de Constantin, métro Colosseo (ligne B)', 41.889800, 12.490700,
   'Coupe-file', true),
  ('colisee-souterrains', 1,
   'Colisée souterrain : les coulisses des gladiateurs',
   'Les sous-sols et le niveau de l''arène, fermés à la visite classique.',
   180, 'small_group', 12, 8900, 6900, 6, '{}', '{}', '{}', NULL,
   'Arc de Constantin, métro Colosseo (ligne B)', 41.889800, 12.490700, NULL, true),
  ('vatican-sixtine', 1,
   'Musées du Vatican, chapelle Sixtine & Saint-Pierre',
   'Le parcours essentiel, sans la file d''attente.',
   210, 'small_group', 15, 7500, 5500, 6, '{}', '{}', '{}',
   'Épaules et genoux couverts.',
   'Viale Vaticano, devant l''entrée des musées', 41.906500, 12.453600, 'Best-seller', true),
  ('food-tour-trastevere', 1,
   'Food tour à Trastevere : 8 dégustations',
   'Supplì, pizza al taglio, fromages et gelato chez les artisans du quartier.',
   180, 'small_group', 12, 7900, 5900, 4, '{}', '{}', '{}', NULL,
   'Piazza di Santa Maria in Trastevere', 41.889500, 12.470200, NULL, true),
  ('rome-by-night', 1,
   'Rome by night : Trevi, Panthéon, piazza Navona',
   'Les places baroques illuminées, sans la foule de la journée.',
   150, 'small_group', 20, 3900, 2500, 0, '{}', '{}', '{}', NULL,
   'Fontaine de Trevi, côté via delle Muratte', 41.900900, 12.483300, NULL, true),
  ('pompei-naples-journee', 2,
   'Pompéi & Naples en une journée depuis Rome',
   'Train rapide, visite guidée de Pompéi et pizza à Naples.',
   720, 'small_group', 16, 16900, 12900, 4, '{}', '{}', '{}', NULL,
   'Gare de Roma Termini, devant la pharmacie', 41.901000, 12.501900, NULL, true);

INSERT INTO activity_categories (activity_id, category_id)
SELECT a.id, c.id FROM activities a, categories c
WHERE (a.slug, c.slug) IN (
  ('colisee-forum-palatin', 'rome-antique'), ('colisee-forum-palatin', 'famille'),
  ('colisee-souterrains',   'rome-antique'), ('colisee-souterrains',   'hors-sentiers'),
  ('vatican-sixtine',       'vatican-art'),
  ('food-tour-trastevere',  'gastronomie'),  ('food-tour-trastevere',  'hors-sentiers'),
  ('rome-by-night',         'rome-by-night'),('rome-by-night',         'famille'),
  ('pompei-naples-journee', 'excursions'),   ('pompei-naples-journee', 'rome-antique'));

INSERT INTO activity_steps (activity_id, position, title, description, duration_minutes)
SELECT id, s.pos, s.title, s.descr, s.mins
FROM activities,
     (VALUES (1, 'Rendez-vous devant l''arc de Constantin', 'Remise des billets et des écouteurs.', 15),
             (2, 'Colisée et arène',      'Construction, spectacles, vie des gladiateurs.', 75),
             (3, 'Colline du Palatin',    'Palais impériaux et vue sur le Circus Maximus.', 45),
             (4, 'Forum romain',          'Temples, curie, voie sacrée. Fin sur place.', 60)
     ) AS s(pos, title, descr, mins)
WHERE slug = 'colisee-forum-palatin';

-- Départs des 14 prochains jours : 9:00, 11:30, 14:00, 16:30 heure de Rome
INSERT INTO departures (activity_id, guide_id, starts_at, capacity)
SELECT a.id, 1 + (extract(doy FROM d)::int % 2),
       (d::date + t)::timestamp AT TIME ZONE 'Europe/Rome',
       a.max_group_size
FROM activities a
CROSS JOIN generate_series(current_date + 1, current_date + 14, interval '1 day') AS d
CROSS JOIN (VALUES (time '09:00'), (time '11:30'), (time '14:00'), (time '16:30')) AS h(t)
WHERE a.slug <> 'rome-by-night';

INSERT INTO departures (activity_id, guide_id, starts_at, capacity)
SELECT a.id, 2, (d::date + time '20:00')::timestamp AT TIME ZONE 'Europe/Rome', a.max_group_size
FROM activities a
CROSS JOIN generate_series(current_date + 1, current_date + 14, interval '1 day') AS d
WHERE a.slug = 'rome-by-night';

-- Un client de test et une réservation confirmée
INSERT INTO customers (email, first_name, last_name, phone)
VALUES ('test@example.com', 'Client', 'Test', '+33 6 00 00 00 00');

INSERT INTO bookings (customer_id, departure_id, adults, children, total_cents, status)
SELECT 1, dp.id, 2, 1, 2 * 6900 + 4900, 'confirmed'
FROM departures dp JOIN activities a ON a.id = dp.activity_id
WHERE a.slug = 'colisee-forum-palatin'
ORDER BY dp.starts_at LIMIT 1;

COMMIT;
