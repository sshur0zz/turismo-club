-- Turismo Club — 28 : le compteur de vouchers passe dans le schéma privé (jamais exposé par l'API ; alerte Advisors 0008)
ALTER TABLE public.voucher_counters SET SCHEMA private;
ALTER TABLE private.voucher_counters DISABLE ROW LEVEL SECURITY;   -- comme private.settings : aucun droit pour anon / authenticated, accès seulement par issue_voucher
REVOKE ALL ON private.voucher_counters FROM public, anon, authenticated;
CREATE OR REPLACE FUNCTION private.issue_voucher(p_item integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it request_items; q quote_requests; sp suppliers; y integer := extract(year FROM now() AT TIME ZONE 'Europe/Rome'); n integer; v integer;
BEGIN
    IF private.current_staff_role() NOT IN ('admin', 'conseiller') THEN RAISE EXCEPTION 'introuvable' USING ERRCODE = 'P0002'; END IF;
    SELECT * INTO it FROM request_items WHERE id = p_item FOR UPDATE;
    IF it.id IS NULL THEN RAISE EXCEPTION 'introuvable' USING ERRCODE = 'P0002'; END IF;
    IF EXISTS (SELECT 1 FROM vouchers WHERE item_id = it.id) THEN RAISE EXCEPTION 'Un voucher existe déjà pour cette prestation' USING ERRCODE = 'P0409'; END IF;
    IF it.supplier_status <> 'confirmed' THEN RAISE EXCEPTION 'Seule une prestation confirmée (avec référence) peut recevoir un voucher' USING ERRCODE = 'P0409'; END IF;
    SELECT * INTO q FROM quote_requests WHERE id = it.request_id;
    SELECT * INTO sp FROM suppliers WHERE id = it.supplier_id;
    INSERT INTO private.voucher_counters (year, last) VALUES (y, 0) ON CONFLICT (year) DO NOTHING;
    UPDATE private.voucher_counters SET last = last + 1 WHERE year = y RETURNING last INTO n;   -- verrou de ligne : pas de trou ni de doublon
    INSERT INTO vouchers (number, request_id, item_id, issued_by, content)
    VALUES ('V' || y || '-' || lpad(n::text, 5, '0'), q.id, it.id, auth.uid(), jsonb_build_object(
        'reference', q.reference, 'client', btrim(coalesce(q.first_name, '') || ' ' || coalesce(q.last_name, '')), 'service', it.label,
        'date', it.service_date, 'time', it.service_time, 'people', it.people, 'supplier', sp.name, 'supplier_phone', coalesce(sp.phone_e164, sp.phone),
        'supplier_address', concat_ws(', ', sp.address, sp.city), 'supplier_ref', it.supplier_ref, 'hotel', q.hotel))
    RETURNING id INTO v;
    UPDATE request_items SET supplier_status = 'issued' WHERE id = it.id;
    INSERT INTO booking_events (request_id, staff_id, kind, message) VALUES (q.id, auth.uid(), 'voucher', 'Voucher émis : V' || y || '-' || lpad(n::text, 5, '0') || ' · ' || it.label);
    RETURN v;
END $$;
