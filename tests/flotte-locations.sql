-- Tests du lot 4 (flotte, locations, états des lieux) — à exécuter dans une transaction annulée, avec un compte admin TEST :
--   BEGIN; SELECT set_config('request.jwt.claims', json_build_object('sub', '<uuid admin TEST>', 'role', 'authenticated')::text, true); <ce fichier> ; ROLLBACK;
-- Données marquées « fictif ». Résultat attendu : aucune ligne contenant « (ERREUR) ».
CREATE TEMP TABLE out (n int, r text);
DO $t$
DECLARE loc1 int; loc2 int; v int; cu int; c int; c2 int; ins int; x int; rc rental_contracts;
BEGIN
  INSERT INTO rental_locations (name) VALUES ('TEST Agence fictive') RETURNING id INTO loc1;
  INSERT INTO rental_locations (name) VALUES ('TEST Aéroport fictif') RETURNING id INTO loc2;
  INSERT INTO rental_location_distances (from_id, to_id, km) VALUES (loc1, loc2, 30), (loc2, loc1, 30);
  INSERT INTO rental_extras (name, price_cents, per) VALUES ('TEST Siège enfant', 500, 'day') RETURNING id INTO x;
  INSERT INTO vehicles (plate, make, model, category, transmission, fuel, seats, home_location_id, daily_price_cents, included_km_per_day, extra_km_cents,
                        km_daily_price_cents, per_km_cents, relocation_per_km_cents, deposit_cents, min_driver_age, min_license_years, odometer_km)
    VALUES ('TE 123 ST', 'Fiat', 'Panda (fictif)', 'economy', 'manual', 'petrol', 5, loc1, 4000, 200, 25, 2500, 20, 100, 30000, 21, 2, 10000) RETURNING id INTO v;
  INSERT INTO customers (first_name, last_name, email) VALUES ('TEST Loueur', 'Fictif', 'tc-test-loc@example.com') RETURNING id INTO cu;
  -- 1. Doublon d'immatriculation (espaces / tirets ignorés)
  BEGIN INSERT INTO vehicles (plate, make, model, category, transmission, fuel, seats) VALUES ('TE123-ST', 'X', 'Y', 'mini', 'manual', 'petrol', 4); INSERT INTO out VALUES (1, '(ERREUR) doublon accepté');
  EXCEPTION WHEN unique_violation THEN INSERT INTO out VALUES (1, 'immatriculation en double refusée'); END;
  -- 2. Location forfait, 3 jours + 1 h = 4 tranches de 24 h ; option 5 €/jour × 4 → 160 + 20 = 180 €
  INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on, extras, pickup_location_id, return_location_id)
    VALUES (v, cu, '2026-12-10 09:00+01', '2026-12-13 10:00+01', 'flat', 'TEST Conducteur', '1990-05-01', 'TEST123', 'B', '2010-01-01', '2030-01-01', jsonb_build_array(jsonb_build_object('id', x, 'qty', 1)), loc1, loc2)
    RETURNING * INTO rc; c := rc.id;
  INSERT INTO out VALUES (2, CASE WHEN rc.days = 4 AND rc.base_total_cents = 18000 AND rc.deposit_cents = 30000 AND rc.reference LIKE 'L2026-%' THEN 'total serveur 180 € (4 jours + option), caution 300 €, réf. ' || rc.reference ELSE '(ERREUR) ' || row_to_json(rc)::text END);
  -- 3. Chevauchement sur le même véhicule refusé
  BEGIN INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on)
    VALUES (v, cu, '2026-12-12 09:00+01', '2026-12-14 09:00+01', 'flat', 'TEST', '1990-05-01', 'TEST123', 'B', '2010-01-01', '2030-01-01'); INSERT INTO out VALUES (3, '(ERREUR) chevauchement accepté');
  EXCEPTION WHEN exclusion_violation THEN INSERT INTO out VALUES (3, 'chevauchement refusé'); END;
  -- 4-6. Permis : expiré avant la fin, conducteur trop jeune, permis trop récent
  BEGIN INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on)
    VALUES (v, cu, '2027-01-10 09:00+01', '2027-01-12 09:00+01', 'flat', 'TEST', '1990-05-01', 'TEST123', 'B', '2010-01-01', '2027-01-11'); INSERT INTO out VALUES (4, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (4, 'permis expiré avant la fin refusé : ' || SQLERRM); END;
  BEGIN INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on)
    VALUES (v, cu, '2027-01-10 09:00+01', '2027-01-12 09:00+01', 'flat', 'TEST', '2007-01-01', 'TEST123', 'B', '2025-01-01', '2035-01-01'); INSERT INTO out VALUES (5, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (5, 'conducteur trop jeune refusé : ' || SQLERRM); END;
  BEGIN INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on)
    VALUES (v, cu, '2027-01-10 09:00+01', '2027-01-12 09:00+01', 'flat', 'TEST', '1990-05-01', 'TEST123', 'B', '2026-06-01', '2035-01-01'); INSERT INTO out VALUES (6, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (6, 'permis trop récent refusé : ' || SQLERRM); END;
  -- 7. Remise des clés impossible sans permis vérifié ni état des lieux signé
  BEGIN UPDATE rental_contracts SET status = 'active' WHERE id = c; INSERT INTO out VALUES (7, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (7, 'remise refusée : ' || SQLERRM); END;
  -- 8. Signature refusée sans les 6 photos obligatoires
  INSERT INTO inspections (contract_id, kind, km, fuel_eighths) VALUES (c, 'departure', 10100, 8) RETURNING id INTO ins;
  BEGIN UPDATE inspections SET signed_at = now(), signature_path = 'x', signed_by_name = 'TEST' WHERE id = ins; INSERT INTO out VALUES (8, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (8, 'signature sans photos refusée : ' || SQLERRM); END;
  INSERT INTO inspection_photos (inspection_id, side, path) SELECT ins, s, 'test/' || s || '.jpg' FROM unnest(ARRAY['front', 'back', 'left', 'right', 'interior', 'dashboard']) s;
  INSERT INTO inspection_damages (inspection_id, zone, type) VALUES (ins, 'rear_bumper', 'scratch');
  UPDATE inspections SET signed_at = now(), signature_path = 'test/sig.png', signed_by_name = 'TEST Conducteur' WHERE id = ins;
  INSERT INTO out SELECT 9, 'signé ; km départ ' || km_start || ', compteur véhicule ' || (SELECT odometer_km FROM vehicles WHERE id = v) FROM rental_contracts WHERE id = c;
  -- 10. Figé après signature
  BEGIN INSERT INTO inspection_damages (inspection_id, zone, type) VALUES (ins, 'hood', 'dent'); INSERT INTO out VALUES (10, '(ERREUR) ajout après signature accepté');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (10, 'état des lieux figé : ' || SQLERRM); END;
  -- 11. Annulation impossible après le départ ; remise des clés OK une fois le permis vérifié
  UPDATE rental_contracts SET license_original_checked = true, status = 'active' WHERE id = c;
  BEGIN UPDATE rental_contracts SET status = 'cancelled' WHERE id = c; INSERT INTO out VALUES (11, '(ERREUR) annulation après départ acceptée');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (11, 'annulation après départ refusée'); END;
  -- 12. Kilométrage jamais décroissant
  BEGIN INSERT INTO vehicle_odometer (vehicle_id, km) VALUES (v, 9000); INSERT INTO out VALUES (12, '(ERREUR)');
  EXCEPTION WHEN others THEN INSERT INTO out VALUES (12, 'kilométrage en baisse refusé'); END;
  -- 13. Retour : 1 000 km parcourus, 4 × 200 km inclus → 200 km × 0,25 € = 50 € ; dégâts saisis 120 € → total 180 + 50 + 120 = 350 €
  INSERT INTO inspections (contract_id, kind, km, fuel_eighths) VALUES (c, 'return', 11100, 6) RETURNING id INTO ins;
  INSERT INTO inspection_photos (inspection_id, side, path) SELECT ins, s, 'test/r-' || s || '.jpg' FROM unnest(ARRAY['front', 'back', 'left', 'right', 'interior', 'dashboard']) s;
  INSERT INTO inspection_damages (inspection_id, zone, type) VALUES (ins, 'rear_bumper', 'scratch'), (ins, 'front_left_door', 'dent');
  UPDATE inspections SET signed_at = now(), signature_path = 'test/sig2.png', signed_by_name = 'TEST Conducteur' WHERE id = ins;
  UPDATE rental_contracts SET damage_fee_cents = 12000, status = 'returned' WHERE id = c RETURNING * INTO rc;
  INSERT INTO out VALUES (13, CASE WHEN rc.km_fee_cents = 5000 AND rc.total_cents = 35000 THEN 'retour : km supp. 50 €, total 350 €' ELSE '(ERREUR) ' || rc.km_fee_cents || ' / ' || rc.total_cents END);
  -- 14. Remise ailleurs : 30 km × 1 € = 30 € de déplacement (lieu de retour = aéroport, la prochaine location part de l'agence)
  INSERT INTO rental_contracts (vehicle_id, customer_id, starts_at, ends_at, formula, driver_name, driver_birthdate, license_number, license_category, license_issued_on, license_expires_on, pickup_location_id)
    VALUES (v, cu, '2027-02-10 09:00+01', '2027-02-11 09:00+01', 'km', 'TEST', '1990-05-01', 'TEST123', 'B', '2010-01-01', '2030-01-01', loc1) RETURNING * INTO rc;
  INSERT INTO out VALUES (14, CASE WHEN rc.relocation_cents = 3000 AND rc.base_total_cents = 5500 THEN 'formule kilométrage : ' || rc.base_total_cents || ' centimes (dont déplacement ' || rc.relocation_cents || ')' ELSE '(ERREUR)' END);
END $t$;
SELECT * FROM out ORDER BY n;
