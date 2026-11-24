-- Tests du calcul de prix d'un séjour (private.price_stay) — à exécuter dans une transaction annulée :
--   BEGIN; <ce fichier> ; ROLLBACK;
-- Toutes les valeurs attendues sont calculées à la main (centimes). Données marquées « fictif ».
DO $t$
DECLARE dest int; h int; rm int; rm2 int; s1 int; q jsonb; pub jsonb;
BEGIN
  SELECT id INTO dest FROM destinations WHERE slug = 'rome';
  INSERT INTO hotels (destination_id, name, boards, baby_max_age, child_max_age, is_published)
    VALUES (dest, 'Hôtel fictif (test)', '{BB,HB}', 1, 11, true) RETURNING id INTO h;
  INSERT INTO hotel_rooms (hotel_id, name, adults_min, adults_max, children_max, occupancy_max, baby_cot)
    VALUES (h, 'Double fictive', 1, 3, 2, 4, true) RETURNING id INTO rm;
  INSERT INTO hotel_rooms (hotel_id, name, adults_min, adults_max, children_max, occupancy_max)
    VALUES (h, 'Arrondi fictif', 1, 2, 0, 2) RETURNING id INTO rm2;
  INSERT INTO hotel_seasons (hotel_id, name, date_from, date_to, min_nights, vat_rate_bp, single_supplement_cents, third_adult_discount_bp)
    VALUES (h, 'Décembre fictif', '2026-12-01', '2026-12-31', 2, 1000, 2000, 3000) RETURNING id INTO s1;
  INSERT INTO hotel_seasons (hotel_id, name, date_from, date_to, vat_rate_bp, stop_sale) VALUES (h, 'Fermé fictif', '2027-01-01', '2027-01-10', 1000, true);
  INSERT INTO hotel_child_bands (season_id, age_from, age_to, discount_bp) VALUES (s1, 2, 5, 10000), (s1, 6, 11, 5000);
  INSERT INTO hotel_rates (season_id, room_id, board, cost_cents, margin_bp) VALUES (s1, rm, 'BB', 10000, 2500);           -- 125,00 €/adulte/nuit HT
  INSERT INTO hotel_rates (season_id, room_id, board, cost_cents, price_cents) VALUES (s1, rm, 'HB', 12000, 15000);         -- prix imposé 150,00 €
  INSERT INTO hotel_rates (season_id, room_id, board, cost_cents, margin_bp) VALUES (s1, rm2, 'BB', 1003, 5000);           -- 15,045 € → arrondi au pair

  -- 1. 2 adultes, BB, 3 nuits : (12 500 × 2) = 25 000 HT + 10 % = 27 500 / nuit → 82 500
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-13', 2, '{}');
  IF (q->>'total_cents')::int <> 82500 OR (q->>'ht_cents')::int <> 75000 OR (q->>'vat_cents')::int <> 7500 OR (q->>'cost_cents')::int <> 60000 THEN RAISE EXCEPTION 'cas 1 : %', q; END IF;
  -- 2. 1 adulte : 12 500 + supplément single 2 000 = 14 500 + 1 450 → 15 950 × 2 = 31 900
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-12', 1, '{}');
  IF (q->>'total_cents')::int <> 31900 THEN RAISE EXCEPTION 'cas 2 : %', q; END IF;
  -- 3. 3 adultes, HB (prix imposé) : 15 000 + 15 000 + 10 500 (−30 %) = 40 500 + 4 050 → 44 550 × 2 = 89 100
  q := private.price_stay(rm, 'HB', '2026-12-10', '2026-12-12', 3, '{}');
  IF (q->>'total_cents')::int <> 89100 THEN RAISE EXCEPTION 'cas 3 : %', q; END IF;
  -- 4. 2 adultes + enfants de 4 ans (gratuit) et 8 ans (−50 %) : 25 000 + 0 + 6 250 = 31 250 + 3 125 → 34 375 × 2 = 68 750
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-12', 2, '{4,8}');
  IF (q->>'total_cents')::int <> 68750 THEN RAISE EXCEPTION 'cas 4 : %', q; END IF;
  -- 5. 2 adultes + bébé (1 an, gratuit, lit bébé) → 55 000
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-12', 2, '{1}');
  IF (q->>'total_cents')::int <> 55000 THEN RAISE EXCEPTION 'cas 5 : %', q; END IF;
  -- 6. Jamais d'enfant sans adulte
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-12', 0, '{8}');
  IF q->>'error' <> 'no_adult' THEN RAISE EXCEPTION 'cas 6 : %', q; END IF;
  -- 7. Séjour minimum de 2 nuits
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-11', 2, '{}');
  IF q->>'error' <> 'min_nights' THEN RAISE EXCEPTION 'cas 7 : %', q; END IF;
  -- 8. Arrondi bancaire : 1 003 × 1,5 = 1 504,5 → 1 504 (pair) ; × 2 adultes = 3 008 ; TVA 300,8 → 301 ; 3 309 × 2 = 6 618
  q := private.price_stay(rm2, 'BB', '2026-12-10', '2026-12-12', 2, '{}');
  IF (q->>'total_cents')::int <> 6618 THEN RAISE EXCEPTION 'cas 8 : %', q; END IF;
  -- 9. Capacité dépassée (4 adultes pour 3 max)
  q := private.price_stay(rm, 'BB', '2026-12-10', '2026-12-12', 4, '{}');
  IF q->>'error' <> 'occupancy' THEN RAISE EXCEPTION 'cas 9 : %', q; END IF;
  -- 10. Arrêt des ventes
  q := private.price_stay(rm, 'BB', '2027-01-02', '2027-01-04', 2, '{}');
  IF q->>'error' <> 'stop_sale' THEN RAISE EXCEPTION 'cas 10 : %', q; END IF;
  -- 11. Recherche publique : prix client TTC seulement, jamais coût ni marge
  pub := private.public_hotel_search('rome', '2026-12-10', '2026-12-13', 2, '{}');
  IF pub::text ~ 'cost' OR pub::text ~ 'margin' OR NOT pub::text ~ '82500' THEN RAISE EXCEPTION 'cas 11 : %', pub; END IF;
  -- 12. Saisons qui se chevauchent : refusé
  BEGIN
    INSERT INTO hotel_seasons (hotel_id, name, date_from, date_to, vat_rate_bp) VALUES (h, 'Chevauchement fictif', '2026-12-20', '2027-01-05', 1000);
    RAISE EXCEPTION 'cas 12 : chevauchement accepté';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  RAISE NOTICE 'tarifs-hotel : 12 cas OK';
END $t$;
SELECT 'tarifs-hotel : 12 cas OK' AS resultat;
