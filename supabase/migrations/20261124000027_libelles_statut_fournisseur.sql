-- Turismo Club — 27 : libellés français des statuts fournisseur dans l'historique (au lieu des codes)
CREATE FUNCTION private.supplier_status_label(s text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
    SELECT CASE s WHEN 'draft' THEN 'Brouillon' WHEN 'requested' THEN 'Demandée' WHEN 'option' THEN 'En option' WHEN 'confirmed' THEN 'Confirmée'
                  WHEN 'issued' THEN 'Émise' WHEN 'refused' THEN 'Refusée' WHEN 'cancelled' THEN 'Annulée' ELSE s END
$$;
REVOKE ALL ON FUNCTION private.supplier_status_label(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.item_supplier_status() RETURNS trigger
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
        RAISE EXCEPTION 'Transition fournisseur interdite : % → %', private.supplier_status_label(OLD.supplier_status), private.supplier_status_label(NEW.supplier_status) USING ERRCODE = 'P0409';
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
    VALUES (NEW.request_id, auth.uid(), 'fournisseur', 'Fournisseur · ' || NEW.label || ' : ' || private.supplier_status_label(OLD.supplier_status) || ' → ' || private.supplier_status_label(NEW.supplier_status)
            || CASE WHEN NEW.supplier_ref IS NOT NULL AND NEW.supplier_status IN ('confirmed', 'issued') THEN ' (réf. ' || NEW.supplier_ref || ')' ELSE '' END);
    RETURN NEW;
END $$;
