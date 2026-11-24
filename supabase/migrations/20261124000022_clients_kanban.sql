-- Turismo Club — 22 : lot 1 « Clients et Kanban » (matrice des écarts, lignes 1, 2, 3, 5, 6)
-- On COMPLÈTE les tables existantes (customers, quote_requests) : aucune table en double, aucune donnée existante réécrite.

-- ---------- Réglages (aucune valeur métier dans le code) ----------
INSERT INTO private.settings (key, value) VALUES
  ('default_phone_country', '39'),          -- indicatif utilisé quand un numéro est saisi sans « + » ni « 00 » (Italie)
  ('consent_version', '2026-11-20')         -- version du texte de consentement affiché sur le site (pages Privacy)
ON CONFLICT (key) DO NOTHING;

-- ---------- Clients : fiche complétée ----------
ALTER TABLE customers
  ADD COLUMN kind text NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'organization')),
  ADD COLUMN company_name text CHECK (company_name IS NULL OR char_length(company_name) <= 200),
  ADD COLUMN phone_e164 text,
  ADD COLUMN notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
  ADD COLUMN merged_into_id integer REFERENCES customers(id),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN customers.phone_e164 IS 'Téléphone normalisé au format international (+39…), calculé par la base à partir de phone';
COMMENT ON COLUMN customers.merged_into_id IS 'Fiche fusionnée dans une autre : conservée pour l''historique, masquée des listes';

-- Normalisation E.164 : chiffres seulement ; « 00 » → « + » ; sans indicatif → indicatif par défaut (réglage)
CREATE FUNCTION private.phone_e164(p text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d text; cc text;
BEGIN
    IF p IS NULL OR btrim(p) = '' THEN RETURN NULL; END IF;
    d := regexp_replace(p, '[^0-9+]', '', 'g');
    IF d LIKE '+%' THEN d := substr(regexp_replace(d, '[^0-9]', '', 'g'), 1);
    ELSIF d LIKE '00%' THEN d := substr(d, 3);
    ELSE
        SELECT value INTO cc FROM private.settings WHERE key = 'default_phone_country';
        d := coalesce(cc, '') || regexp_replace(d, '[^0-9]', '', 'g');
    END IF;
    d := regexp_replace(d, '[^0-9]', '', 'g');
    IF char_length(d) BETWEEN 8 AND 15 AND d !~ '^0' THEN RETURN '+' || d; END IF;
    RETURN NULL;  -- numéro inexploitable : on garde la saisie d'origine dans phone, sans inventer
END $$;
REVOKE ALL ON FUNCTION private.phone_e164(text) FROM public, anon, authenticated;

CREATE FUNCTION private.customer_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.phone_e164 := private.phone_e164(NEW.phone);
    IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.customer_before_write() FROM public, anon, authenticated;
CREATE TRIGGER customer_before_write BEFORE INSERT OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION private.customer_before_write();
UPDATE customers SET phone_e164 = private.phone_e164(phone);   -- calcul initial (phone d'origine inchangé)

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE INDEX customers_phone_e164 ON customers (phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX customers_merged ON customers (merged_into_id);

-- ---------- Fusion de doublons, historisée ----------
CREATE TABLE customer_merges (
    id bigserial PRIMARY KEY,
    kept_id integer NOT NULL REFERENCES customers(id),
    merged_id integer NOT NULL REFERENCES customers(id),
    moved_requests integer NOT NULL,
    merged_by uuid REFERENCES staff(id),
    merged_at timestamptz NOT NULL DEFAULT now(),
    snapshot jsonb NOT NULL                                    -- fiche fusionnée telle qu'elle était
);
ALTER TABLE customer_merges ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_read_merges ON customer_merges FOR SELECT TO authenticated
  USING (private.current_staff_role() IN ('admin', 'conseiller'));
REVOKE ALL ON customer_merges FROM anon;
GRANT SELECT ON customer_merges TO authenticated;

CREATE FUNCTION private.merge_customers(p_keep integer, p_merge integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k customers; m customers; n integer;
BEGIN
    IF private.current_staff_role() NOT IN ('admin', 'conseiller') THEN RAISE EXCEPTION 'introuvable' USING ERRCODE = 'P0002'; END IF;
    IF p_keep = p_merge THEN RAISE EXCEPTION 'Une fiche ne peut pas être fusionnée avec elle-même' USING ERRCODE = '22023'; END IF;
    SELECT * INTO k FROM customers WHERE id = p_keep AND merged_into_id IS NULL FOR UPDATE;
    SELECT * INTO m FROM customers WHERE id = p_merge AND merged_into_id IS NULL FOR UPDATE;
    IF k.id IS NULL OR m.id IS NULL THEN RAISE EXCEPTION 'introuvable' USING ERRCODE = 'P0002'; END IF;
    UPDATE quote_requests SET customer_id = k.id WHERE customer_id = m.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    -- La fiche fusionnée libère d'abord son e-mail (unique), puis la fiche gardée complète ses champs vides : rien n'est écrasé
    UPDATE customers SET merged_into_id = k.id, email = NULL WHERE id = m.id;
    UPDATE customers SET
        email = coalesce(k.email, m.email), first_name = coalesce(nullif(k.first_name, ''), m.first_name),
        last_name = coalesce(k.last_name, m.last_name), phone = coalesce(k.phone, m.phone),
        locale = coalesce(k.locale, m.locale), company_name = coalesce(k.company_name, m.company_name),
        notes = CASE WHEN m.notes IS NULL THEN k.notes WHEN k.notes IS NULL THEN m.notes ELSE k.notes || E'\n' || m.notes END
      WHERE id = k.id;
    INSERT INTO customer_merges (kept_id, merged_id, moved_requests, merged_by, snapshot) VALUES (k.id, m.id, n, auth.uid(), to_jsonb(m));
    RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.merge_customers(integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.merge_customers(integer, integer) TO authenticated;
CREATE FUNCTION public.merge_customers(p_keep integer, p_merge integer) RETURNS integer
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.merge_customers(p_keep, p_merge) $$;
REVOKE ALL ON FUNCTION public.merge_customers(integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.merge_customers(integer, integer) TO authenticated;

-- Doublons probables : même e-mail, même téléphone normalisé, ou même nom complet
CREATE FUNCTION private.customer_duplicates() RETURNS TABLE (a integer, b integer, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT x.id, y.id, CASE WHEN x.email IS NOT NULL AND x.email = y.email THEN 'email'
                            WHEN x.phone_e164 IS NOT NULL AND x.phone_e164 = y.phone_e164 THEN 'phone' ELSE 'name' END
      FROM customers x JOIN customers y ON x.id < y.id
     WHERE private.current_staff_role() IN ('admin', 'conseiller')
       AND x.merged_into_id IS NULL AND y.merged_into_id IS NULL
       AND ((x.email IS NOT NULL AND x.email = y.email)
         OR (x.phone_e164 IS NOT NULL AND x.phone_e164 = y.phone_e164)
         OR (coalesce(x.last_name, '') <> '' AND lower(x.first_name || ' ' || x.last_name) = lower(y.first_name || ' ' || coalesce(y.last_name, ''))))
     ORDER BY x.id, y.id LIMIT 200
$$;
REVOKE ALL ON FUNCTION private.customer_duplicates() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.customer_duplicates() TO authenticated;
CREATE FUNCTION public.customer_duplicates() RETURNS TABLE (a integer, b integer, reason text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM private.customer_duplicates() $$;
REVOKE ALL ON FUNCTION public.customer_duplicates() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.customer_duplicates() TO authenticated;

-- ---------- Consentement : version du texte accepté ----------
ALTER TABLE quote_requests ADD COLUMN consent_version text;
CREATE FUNCTION private.quote_consent_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.consent_at IS NOT NULL AND NEW.consent_version IS NULL THEN
        SELECT value INTO NEW.consent_version FROM private.settings WHERE key = 'consent_version';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_consent_version() FROM public, anon, authenticated;
CREATE TRIGGER quote_consent_version BEFORE INSERT ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_consent_version();

-- ---------- Kanban : motif de perte obligatoire ----------
ALTER TABLE quote_requests ADD COLUMN lost_reason text CHECK (lost_reason IS NULL OR char_length(lost_reason) <= 500);
ALTER TABLE quote_requests ADD CONSTRAINT quote_lost_needs_reason CHECK (status <> 'lost' OR char_length(btrim(coalesce(lost_reason, ''))) > 0);
CREATE FUNCTION private.quote_lost_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'lost' AND NEW.lost_reason IS DISTINCT FROM OLD.lost_reason THEN
        INSERT INTO booking_events (request_id, staff_id, kind, message) VALUES (NEW.id, auth.uid(), 'motif_perte', 'Motif d''annulation : ' || NEW.lost_reason);
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_lost_history() FROM public, anon, authenticated;
CREATE TRIGGER quote_lost_history AFTER UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_lost_history();
