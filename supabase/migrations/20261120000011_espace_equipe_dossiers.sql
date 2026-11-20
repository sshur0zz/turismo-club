-- Turismo Club — 11 : espace équipe, phase A (dossiers, prestations, paiements, historique)
-- Un « dossier » = une ligne de quote_requests : la demande devient la réservation une fois confirmée.

-- ============ 1. Dossier ============
ALTER TABLE quote_requests
  ADD COLUMN reference     text UNIQUE,                                     -- ex. TC-2611-014
  ADD COLUMN customer_id   int REFERENCES customers(id),
  ADD COLUMN hotel         text CHECK (hotel IS NULL OR char_length(hotel) <= 200),
  ADD COLUMN internal_note text CHECK (internal_note IS NULL OR char_length(internal_note) <= 4000),
  ADD COLUMN updated_at    timestamptz NOT NULL DEFAULT now();
CREATE INDEX ON quote_requests (customer_id);
CREATE INDEX ON quote_requests (assigned_staff_id);

-- Avant insertion : référence lisible, offre retrouvée par son slug, client créé ou retrouvé par e-mail.
-- Un visiteur (pas du personnel) ne peut pas remplir les champs internes.
CREATE FUNCTION private.quote_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_staff boolean := private.current_staff_role() IS NOT NULL;
BEGIN
    IF NOT is_staff THEN
        NEW.customer_id := NULL; NEW.internal_note := NULL;
    END IF;
    NEW.reference := 'TC-' || to_char(now() AT TIME ZONE 'Europe/Rome', 'YYMM') || '-' || lpad(NEW.id::text, 3, '0');
    IF NEW.activity_id IS NULL AND NEW.offer_slug IS NOT NULL THEN
        SELECT id INTO NEW.activity_id FROM activities WHERE slug = NEW.offer_slug;
    END IF;
    IF NEW.customer_id IS NULL THEN
        SELECT id INTO NEW.customer_id FROM customers WHERE email = NEW.email;
        IF NEW.customer_id IS NULL THEN
            INSERT INTO customers (email, first_name, last_name, phone, locale)
            VALUES (NEW.email, NEW.first_name, coalesce(NEW.last_name, ''), NEW.phone, coalesce(NEW.preferred_language, NEW.language, 'en'))
            RETURNING id INTO NEW.customer_id;
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER quote_before_insert BEFORE INSERT ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_before_insert();
CREATE TRIGGER quote_updated_at BEFORE UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ 2. Prestations (lignes du dossier) ============
CREATE TABLE request_items (
    id           serial PRIMARY KEY,
    request_id   int NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    activity_id  int REFERENCES activities(id),
    label        text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    service_date date,
    service_time text CHECK (service_time IS NULL OR service_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
    people       int  NOT NULL DEFAULT 1 CHECK (people BETWEEN 1 AND 999),
    amount_cents int  NOT NULL DEFAULT 0 CHECK (amount_cents BETWEEN 0 AND 100000000),
    created_by   uuid DEFAULT auth.uid() REFERENCES staff(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON request_items (request_id);
CREATE INDEX ON request_items (activity_id);

-- Demande venant du site : une première ligne est créée avec l'offre et le prix indicatif (adulte × personnes).
CREATE FUNCTION private.quote_first_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a activities%ROWTYPE; t text;
BEGIN
    IF NEW.activity_id IS NOT NULL THEN
        SELECT * INTO a FROM activities WHERE id = NEW.activity_id;
        t := substring(coalesce(NEW.message, '') FROM 'time ([0-2][0-9]:[0-5][0-9])');
        INSERT INTO request_items (request_id, activity_id, label, service_date, service_time, people, amount_cents, created_by)
        VALUES (NEW.id, a.id, a.title, NEW.date_from, t, coalesce(NEW.travelers, 1),
                a.price_adult_cents * coalesce(NEW.travelers, 1), NULL);
    END IF;
    INSERT INTO booking_events (request_id, staff_id, kind, message)
    VALUES (NEW.id, auth.uid(), 'creation', 'Demande créée (source : ' || NEW.source || ')');
    RETURN NEW;
END $$;

-- ============ 3. Paiements (saisie manuelle ; Stripe plus tard) ============
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN provider SET DEFAULT 'manuel';
ALTER TABLE payments ALTER COLUMN provider_ref DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'succeeded';
ALTER TABLE payments
  ADD COLUMN request_id int REFERENCES quote_requests(id) ON DELETE CASCADE,
  ADD COLUMN method     text CHECK (method IS NULL OR method IN ('especes', 'virement', 'carte_sur_place', 'stripe')),
  ADD COLUMN paid_on    date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Rome')::date,
  ADD COLUMN note       text CHECK (note IS NULL OR char_length(note) <= 500),
  ADD COLUMN created_by uuid DEFAULT auth.uid() REFERENCES staff(id) ON DELETE SET NULL,
  ADD CONSTRAINT payments_target CHECK (booking_id IS NOT NULL OR request_id IS NOT NULL),
  ADD CONSTRAINT payments_amount CHECK (amount_cents BETWEEN -100000000 AND 100000000 AND amount_cents <> 0);
CREATE INDEX ON payments (request_id);

-- ============ 4. Historique ============
ALTER TABLE booking_events ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE booking_events
  ADD COLUMN request_id int REFERENCES quote_requests(id) ON DELETE CASCADE,
  ADD CONSTRAINT booking_events_target CHECK (booking_id IS NOT NULL OR request_id IS NOT NULL);
ALTER TABLE booking_events ALTER COLUMN staff_id SET DEFAULT auth.uid();
ALTER TABLE booking_events DROP CONSTRAINT booking_events_kind_check;
ALTER TABLE booking_events ADD CONSTRAINT booking_events_kind_check CHECK (kind IN
  ('note', 'appel', 'email', 'modification', 'annulation', 'remboursement',
   'creation', 'statut', 'responsable', 'paiement', 'prestation', 'note_interne', 'guide', 'pointage'));
CREATE INDEX ON booking_events (request_id, created_at);

CREATE FUNCTION private.status_label(s quote_status) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE s WHEN 'new' THEN 'Nouvelle' WHEN 'in_progress' THEN 'En cours' WHEN 'sent' THEN 'Devis envoyé'
                WHEN 'won' THEN 'Confirmée' WHEN 'done' THEN 'Terminée' WHEN 'lost' THEN 'Annulée' END
$$;
CREATE FUNCTION private.staff_name(p uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT full_name FROM staff WHERE id = p), 'personne')
$$;
CREATE FUNCTION private.euros(c int) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(to_char(c / 100.0, 'FM9999999990.00'), '.', ',') || ' €'
$$;

-- Changements d'étape, de responsable et de note interne
CREATE FUNCTION private.quote_after_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO booking_events (request_id, staff_id, kind, message)
        VALUES (NEW.id, auth.uid(), 'statut', 'Étape : ' || private.status_label(OLD.status) || ' → ' || private.status_label(NEW.status));
    END IF;
    IF NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
        INSERT INTO booking_events (request_id, staff_id, kind, message)
        VALUES (NEW.id, auth.uid(), 'responsable', 'Responsable : ' || private.staff_name(OLD.assigned_staff_id) || ' → ' || private.staff_name(NEW.assigned_staff_id));
    END IF;
    IF NEW.internal_note IS DISTINCT FROM OLD.internal_note THEN
        INSERT INTO booking_events (request_id, staff_id, kind, message)
        VALUES (NEW.id, auth.uid(), 'note_interne', 'Note interne modifiée');
    END IF;
    RETURN NEW;
END $$;

CREATE FUNCTION private.item_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r request_items%ROWTYPE := coalesce(NEW, OLD); verb text;
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.label, NEW.service_date, NEW.service_time, NEW.people, NEW.amount_cents, NEW.activity_id)
       IS NOT DISTINCT FROM (OLD.label, OLD.service_date, OLD.service_time, OLD.people, OLD.amount_cents, OLD.activity_id) THEN
        RETURN NEW;
    END IF;
    -- Pas d'historique pour la ligne créée automatiquement avec la demande (déjà tracée par « Demande créée »)
    IF TG_OP = 'INSERT' AND auth.uid() IS NULL THEN RETURN NEW; END IF;
    -- Dossier supprimé : pas d'historique à écrire
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM quote_requests WHERE id = OLD.request_id) THEN RETURN OLD; END IF;
    verb := CASE TG_OP WHEN 'INSERT' THEN 'ajoutée' WHEN 'UPDATE' THEN 'modifiée' ELSE 'supprimée' END;
    INSERT INTO booking_events (request_id, staff_id, kind, message)
    VALUES (r.request_id, auth.uid(), 'prestation', 'Prestation ' || verb || ' : ' || r.label || ' · ' || r.people || ' pers. · ' || private.euros(r.amount_cents));
    RETURN coalesce(NEW, OLD);
END $$;

CREATE FUNCTION private.payment_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r payments%ROWTYPE := coalesce(NEW, OLD);
BEGIN
    IF r.request_id IS NULL THEN RETURN coalesce(NEW, OLD); END IF;
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM quote_requests WHERE id = OLD.request_id) THEN RETURN OLD; END IF;
    INSERT INTO booking_events (request_id, staff_id, kind, message)
    VALUES (r.request_id, auth.uid(), 'paiement',
            CASE WHEN TG_OP = 'DELETE' THEN 'Paiement annulé : ' ELSE 'Paiement enregistré : ' END
            || private.euros(r.amount_cents) || ' (' || coalesce(replace(r.method, '_', ' '), r.provider) || ', ' || to_char(r.paid_on, 'DD/MM/YYYY') || ')');
    RETURN coalesce(NEW, OLD);
END $$;

CREATE TRIGGER quote_first_item AFTER INSERT ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_first_item();
CREATE TRIGGER quote_after_update AFTER UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_after_update();
CREATE TRIGGER item_history AFTER INSERT OR UPDATE OR DELETE ON request_items FOR EACH ROW EXECUTE FUNCTION private.item_history();
CREATE TRIGGER payment_history AFTER INSERT OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION private.payment_history();
-- Journal d'audit complet (auteur + heure + avant/après)
CREATE TRIGGER audit_quote_requests AFTER INSERT OR UPDATE OR DELETE ON quote_requests FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_request_items  AFTER INSERT OR UPDATE OR DELETE ON request_items  FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_payments       AFTER INSERT OR UPDATE OR DELETE ON payments       FOR EACH ROW EXECUTE FUNCTION write_audit();

REVOKE ALL ON FUNCTION private.quote_before_insert(), private.quote_first_item(), private.quote_after_update(),
  private.item_history(), private.payment_history(), private.status_label(quote_status), private.staff_name(uuid), private.euros(int)
  FROM public, anon, authenticated;

-- ============ 5. Droits (RLS) ============
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_items ON request_items FOR ALL TO authenticated
  USING (private.current_staff_role() = 'admin') WITH CHECK (private.current_staff_role() = 'admin');
CREATE POLICY cons_items ON request_items FOR ALL TO authenticated
  USING (private.current_staff_role() = 'conseiller') WITH CHECK (private.current_staff_role() = 'conseiller');

-- Conseiller : peut enregistrer un paiement (mais pas en supprimer : réservé à l'admin)
CREATE POLICY cons_payments_add ON payments FOR INSERT TO authenticated
  WITH CHECK (private.current_staff_role() = 'conseiller' AND created_by = auth.uid());

-- Admin et conseiller voient l'équipe (menu « Responsable ») ; seul l'admin la modifie
CREATE POLICY team_read_staff ON staff FOR SELECT TO authenticated
  USING (private.current_staff_role() IN ('admin', 'conseiller'));

-- Les visiteurs (anon) ne gardent que le droit d'envoyer une demande ; ils ne peuvent rien lire
REVOKE ALL ON quote_requests, request_items, customers, bookings, payments, booking_events, audit_log, staff FROM anon;
GRANT INSERT ON quote_requests TO anon;
REVOKE ALL ON request_items FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON request_items TO authenticated;
GRANT USAGE ON SEQUENCE request_items_id_seq TO authenticated;

-- ============ 6. Direct (Realtime) ============
ALTER PUBLICATION supabase_realtime ADD TABLE quote_requests;
