-- Turismo Club — 26 : lot 3 « Dossiers complétés » (matrice des écarts, lignes 4 et 9)
-- Statuts fournisseur par prestation, vouchers numérotés sans trou et figés, tâches avec échéance.
-- Confirmation honnête : la plateforme n'envoie ni ne simule rien chez le fournisseur ; l'agent saisit la référence.

-- ---------- Statut fournisseur des prestations (on COMPLÈTE request_items) ----------
ALTER TABLE request_items
  ADD COLUMN supplier_id integer REFERENCES suppliers(id),
  ADD COLUMN supplier_status text NOT NULL DEFAULT 'draft'
      CHECK (supplier_status IN ('draft', 'requested', 'option', 'confirmed', 'issued', 'refused', 'cancelled')),
  ADD COLUMN supplier_ref text CHECK (supplier_ref IS NULL OR char_length(supplier_ref) <= 120),
  ADD COLUMN option_until date,
  ADD COLUMN supplier_status_at timestamptz;

-- Transitions autorisées ; toute autre = refus (409 côté écran). Confirmer exige la référence ; une option exige son échéance.
CREATE FUNCTION private.item_supplier_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed text[];
BEGIN
    IF NEW.supplier_status IS NOT DISTINCT FROM OLD.supplier_status THEN
        IF OLD.supplier_status IN ('confirmed', 'issued') AND NEW.supplier_ref IS DISTINCT FROM OLD.supplier_ref THEN
            RAISE EXCEPTION 'La référence d''une prestation confirmée ne se modifie pas' USING ERRCODE = 'P0409';
        END IF;
        RETURN NEW;
    END IF;
    allowed := CASE OLD.supplier_status
        WHEN 'draft'     THEN ARRAY['requested', 'cancelled']
        WHEN 'requested' THEN ARRAY['option', 'confirmed', 'refused', 'cancelled']
        WHEN 'option'    THEN ARRAY['confirmed', 'refused', 'cancelled']
        WHEN 'confirmed' THEN ARRAY['issued', 'cancelled']
        WHEN 'issued'    THEN ARRAY['cancelled']
        WHEN 'refused'   THEN ARRAY['requested']
        ELSE ARRAY[]::text[] END;
    IF NOT (NEW.supplier_status = ANY (allowed)) THEN
        RAISE EXCEPTION 'Transition fournisseur interdite : % → %', OLD.supplier_status, NEW.supplier_status USING ERRCODE = 'P0409';
    END IF;
    IF NEW.supplier_status = 'option' AND NEW.option_until IS NULL THEN
        RAISE EXCEPTION 'Une option demande une date d''échéance' USING ERRCODE = 'P0409';
    END IF;
    IF NEW.supplier_status IN ('confirmed', 'issued') AND btrim(coalesce(NEW.supplier_ref, '')) = '' THEN
        RAISE EXCEPTION 'Confirmer demande la référence du fournisseur' USING ERRCODE = 'P0409';
    END IF;
    IF NEW.supplier_status IN ('requested', 'option', 'confirmed', 'issued') AND NEW.supplier_id IS NULL THEN
        RAISE EXCEPTION 'Choisissez d''abord le fournisseur' USING ERRCODE = 'P0409';
    END IF;
    NEW.supplier_status_at := now();
    INSERT INTO booking_events (request_id, staff_id, kind, message)
    VALUES (NEW.request_id, auth.uid(), 'fournisseur', 'Fournisseur · ' || NEW.label || ' : ' || OLD.supplier_status || ' → ' || NEW.supplier_status
            || CASE WHEN NEW.supplier_ref IS NOT NULL AND NEW.supplier_status IN ('confirmed', 'issued') THEN ' (réf. ' || NEW.supplier_ref || ')' ELSE '' END);
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.item_supplier_status() FROM public, anon, authenticated;
CREATE TRIGGER item_supplier_status BEFORE UPDATE ON request_items FOR EACH ROW EXECUTE FUNCTION private.item_supplier_status();

-- ---------- Vouchers : numérotation sans trou par année, contenu figé, sans prix ----------
CREATE TABLE voucher_counters (year integer PRIMARY KEY, last integer NOT NULL DEFAULT 0);
ALTER TABLE voucher_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON voucher_counters FROM anon, authenticated;     -- géré uniquement par issue_voucher

CREATE TABLE vouchers (
    id serial PRIMARY KEY,
    number text NOT NULL UNIQUE,
    request_id integer NOT NULL REFERENCES quote_requests(id),
    item_id integer NOT NULL UNIQUE REFERENCES request_items(id),
    issued_at timestamptz NOT NULL DEFAULT now(),
    issued_by uuid REFERENCES staff(id),
    content jsonb NOT NULL                                      -- instantané : client, prestation, date, personnes, fournisseur, référence (aucun prix)
);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vouchers FROM anon;
GRANT SELECT ON vouchers TO authenticated;
CREATE POLICY team_read_vouchers ON vouchers FOR SELECT TO authenticated USING (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE FUNCTION private.voucher_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Un voucher émis ne se modifie pas et ne se supprime pas' USING ERRCODE = 'P0409'; END $$;
REVOKE ALL ON FUNCTION private.voucher_immutable() FROM public, anon, authenticated;
CREATE TRIGGER voucher_immutable BEFORE UPDATE OR DELETE ON vouchers FOR EACH ROW EXECUTE FUNCTION private.voucher_immutable();

CREATE FUNCTION private.issue_voucher(p_item integer) RETURNS integer
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
    INSERT INTO voucher_counters (year, last) VALUES (y, 0) ON CONFLICT (year) DO NOTHING;
    UPDATE voucher_counters SET last = last + 1 WHERE year = y RETURNING last INTO n;   -- verrou de ligne : pas de trou ni de doublon
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
REVOKE ALL ON FUNCTION private.issue_voucher(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.issue_voucher(integer) TO authenticated;
CREATE FUNCTION public.issue_voucher(p_item integer) RETURNS integer
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.issue_voucher(p_item) $$;
REVOKE ALL ON FUNCTION public.issue_voucher(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.issue_voucher(integer) TO authenticated;

-- ---------- Tâches ----------
CREATE TABLE tasks (
    id serial PRIMARY KEY,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
    due_date date,
    assigned_to uuid REFERENCES staff(id),
    request_id integer REFERENCES quote_requests(id) ON DELETE CASCADE,
    customer_id integer REFERENCES customers(id),
    done_at timestamptz,
    created_by uuid REFERENCES staff(id) DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_open ON tasks (assigned_to, due_date) WHERE done_at IS NULL;
CREATE INDEX tasks_request ON tasks (request_id);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT USAGE ON SEQUENCE tasks_id_seq TO authenticated;
CREATE POLICY team_all_tasks ON tasks FOR ALL TO authenticated
  USING (private.current_staff_role() IN ('admin', 'conseiller')) WITH CHECK (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE FUNCTION private.task_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.request_id IS NOT NULL AND (TG_OP = 'INSERT' OR (NEW.done_at IS NOT NULL AND OLD.done_at IS NULL)) THEN
        INSERT INTO booking_events (request_id, staff_id, kind, message)
        VALUES (NEW.request_id, auth.uid(), 'tache', CASE WHEN TG_OP = 'INSERT' THEN 'Tâche créée : ' ELSE 'Tâche terminée : ' END || NEW.title);
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.task_history() FROM public, anon, authenticated;
CREATE TRIGGER task_history AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION private.task_history();
