-- Tests du lot 3 (statuts fournisseur, vouchers, tâches) — à exécuter dans une transaction annulée, avec un compte admin TEST :
--   BEGIN; SELECT set_config('request.jwt.claims', json_build_object('sub', '<uuid admin TEST>', 'role', 'authenticated')::text, true); <ce fichier> ; ROLLBACK;
-- Résultat attendu (24/11/2026) : 12 lignes, aucune « (ERREUR) ».
CREATE TEMP TABLE out (n int, r text);
DO $t$
DECLARE q int; it int; sp int; v int;
BEGIN
  INSERT INTO suppliers (kind, name) VALUES ('receptive', 'TEST Fournisseur fictif') RETURNING id INTO sp;
  INSERT INTO quote_requests (first_name, email, source, status, travelers, offer_slug, interests) VALUES ('TEST Voucher', 'tc-test-v@example.com', 'agence', 'new', 2, 'sur-mesure', '{}') RETURNING id INTO q;
  INSERT INTO request_items (request_id, label, people, amount_cents, service_date) VALUES (q, 'TEST Visite fictive', 2, 10000, '2026-12-12') RETURNING id INTO it;
  BEGIN UPDATE request_items SET supplier_status = 'confirmed' WHERE id = it; INSERT INTO out VALUES (1, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (1, 'brouillon → confirmé refusé'); END;
  BEGIN UPDATE request_items SET supplier_status = 'requested' WHERE id = it; INSERT INTO out VALUES (2, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (2, 'demandé sans fournisseur refusé'); END;
  UPDATE request_items SET supplier_id = sp, supplier_status = 'requested' WHERE id = it; INSERT INTO out VALUES (3, 'demandé : ok');
  BEGIN UPDATE request_items SET supplier_status = 'option' WHERE id = it; INSERT INTO out VALUES (4, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (4, 'option sans échéance refusée'); END;
  BEGIN UPDATE request_items SET supplier_status = 'confirmed' WHERE id = it; INSERT INTO out VALUES (5, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (5, 'confirmé sans référence refusé'); END;
  BEGIN PERFORM private.issue_voucher(it); INSERT INTO out VALUES (6, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (6, 'voucher avant confirmation refusé'); END;
  UPDATE request_items SET supplier_status = 'confirmed', supplier_ref = 'TEST-REF-42' WHERE id = it; INSERT INTO out VALUES (7, 'confirmé avec référence : ok');
  v := private.issue_voucher(it); INSERT INTO out SELECT 8, 'voucher ' || number || ' sans prix : ' || (NOT content::text ~ 'amount|cents')::text FROM vouchers WHERE id = v;
  BEGIN UPDATE vouchers SET content = '{}' WHERE id = v; INSERT INTO out VALUES (9, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (9, 'voucher figé'); END;
  BEGIN PERFORM private.issue_voucher(it); INSERT INTO out VALUES (10, 'accepté (ERREUR)'); EXCEPTION WHEN others THEN INSERT INTO out VALUES (10, 'second voucher refusé'); END;
  INSERT INTO out SELECT 11, 'statut après voucher : ' || supplier_status FROM request_items WHERE id = it;
  INSERT INTO tasks (title, due_date, request_id) VALUES ('TEST rappeler le client', '2026-12-01', q);
  UPDATE tasks SET done_at = now() WHERE request_id = q;
  INSERT INTO out SELECT 12, 'historique : ' || count(*) || ' entrées' FROM booking_events WHERE request_id = q AND kind IN ('fournisseur', 'voucher', 'tache');
END $t$;
SELECT * FROM out ORDER BY n;
