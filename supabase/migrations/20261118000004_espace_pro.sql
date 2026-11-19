-- =====================================================================
-- Turismo Club — Espace pro (back-office) · migration v2
-- À exécuter APRÈS 01_schema.sql.
-- Conçu pour Supabase : auth.uid() = id de l'utilisateur connecté,
-- rôles Postgres « anon » (visiteur) et « authenticated » (connecté).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Le personnel et ses rôles
-- ---------------------------------------------------------------------
CREATE TYPE staff_role AS ENUM ('admin', 'conseiller', 'guide');

CREATE TABLE staff (
    id         uuid PRIMARY KEY,                 -- = auth.users.id dans Supabase
    email      citext NOT NULL UNIQUE,
    full_name  text NOT NULL,
    role       staff_role NOT NULL,
    guide_id   int UNIQUE REFERENCES guides(id), -- obligatoire si role = guide
    is_active  boolean NOT NULL DEFAULT true,    -- désactiver plutôt que supprimer
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (role <> 'guide' OR guide_id IS NOT NULL)
);

-- Rôle de la personne connectée (NULL si pas membre actif du personnel)
CREATE FUNCTION current_staff_role() RETURNS staff_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM staff WHERE id = auth.uid() AND is_active
$$;

CREATE FUNCTION current_guide_id() RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT guide_id FROM staff WHERE id = auth.uid() AND is_active
$$;

-- ---------------------------------------------------------------------
-- 2. Suivi du travail
-- ---------------------------------------------------------------------
-- Journal d'une réservation : notes internes, appels, remboursements…
CREATE TABLE booking_events (
    id         bigserial PRIMARY KEY,
    booking_id int  NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id   uuid REFERENCES staff(id),
    kind       text NOT NULL CHECK (kind IN ('note', 'appel', 'email', 'modification', 'annulation', 'remboursement')),
    message    text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON booking_events (booking_id, created_at);

-- Devis : conseiller en charge (remplace le champ texte assigned_to)
ALTER TABLE quote_requests ADD COLUMN assigned_staff_id uuid REFERENCES staff(id);
ALTER TABLE quote_requests DROP COLUMN assigned_to;

-- Présence des participants, cochée par le guide le jour J
ALTER TABLE bookings ADD COLUMN checked_in_at timestamptz;

-- ---------------------------------------------------------------------
-- 3. Journal d'audit : qui a changé quoi, quand (non modifiable)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    id         bigserial PRIMARY KEY,
    table_name text NOT NULL,
    row_id     text NOT NULL,
    action     text NOT NULL,                    -- INSERT / UPDATE / DELETE
    staff_id   uuid,                             -- NULL = site public ou système
    old_data   jsonb,
    new_data   jsonb,
    at         timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION write_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO audit_log (table_name, row_id, action, staff_id, old_data, new_data)
    VALUES (TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::text,
            TG_OP,
            auth.uid(),
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
            CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
    RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER audit_bookings   AFTER INSERT OR UPDATE OR DELETE ON bookings   FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_departures AFTER INSERT OR UPDATE OR DELETE ON departures FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_activities AFTER INSERT OR UPDATE OR DELETE ON activities FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_staff      AFTER INSERT OR UPDATE OR DELETE ON staff      FOR EACH ROW EXECUTE FUNCTION write_audit();

-- ---------------------------------------------------------------------
-- 4. Vues de travail
-- ---------------------------------------------------------------------
-- Feuille de route du guide : un départ + la liste des participants
CREATE VIEW v_manifest WITH (security_invoker = true) AS
SELECT dp.id AS departure_id, dp.starts_at, a.title AS activity, a.meeting_point,
       dp.guide_id, g.first_name AS guide,
       b.id AS booking_id, b.reference, c.first_name, c.last_name, c.phone,
       b.adults, b.children, b.notes, b.checked_in_at
FROM departures dp
JOIN activities a ON a.id = dp.activity_id
LEFT JOIN guides g ON g.id = dp.guide_id
JOIN bookings b  ON b.departure_id = dp.id AND b.status = 'confirmed'
JOIN customers c ON c.id = b.customer_id;

-- Tableau de bord du personnel de bureau
CREATE VIEW v_dashboard WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM bookings WHERE created_at >= current_date)                      AS reservations_aujourdhui,
  (SELECT round(coalesce(sum(total_cents), 0) / 100.0, 2) FROM bookings
     WHERE status = 'confirmed' AND created_at >= date_trunc('month', now()))            AS ca_mois_euros,
  (SELECT coalesce(sum(b.adults + b.children), 0) FROM bookings b
     JOIN departures d ON d.id = b.departure_id
    WHERE b.status = 'confirmed' AND d.starts_at BETWEEN now() AND now() + interval '7 days') AS voyageurs_7_jours,
  (SELECT count(*) FROM quote_requests WHERE status = 'new')                            AS devis_a_traiter,
  (SELECT count(*) FROM departures d WHERE d.guide_id IS NULL AND d.status = 'open'
     AND d.starts_at BETWEEN now() AND now() + interval '7 days'
     AND EXISTS (SELECT 1 FROM bookings b WHERE b.departure_id = d.id AND b.status = 'confirmed')) AS departs_sans_guide;

-- ---------------------------------------------------------------------
-- 5. Droits d'accès ligne par ligne (Row Level Security)
--    admin      : tout
--    conseiller : réservations, clients, devis, créneaux ; lecture catalogue
--    guide      : uniquement SES départs et leurs participants
--    visiteur   : catalogue publié et créneaux ouverts (le site public)
--    Les réservations du site sont créées côté serveur (clé service_role,
--    qui contourne RLS), jamais directement depuis le navigateur.
-- ---------------------------------------------------------------------
ALTER TABLE activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

-- Site public
CREATE POLICY public_read_activities ON activities FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY public_read_departures ON departures FOR SELECT TO anon, authenticated USING (status = 'open' AND starts_at > now());

-- Admin : tout
CREATE POLICY admin_all_activities ON activities     FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_departures ON departures     FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_bookings   ON bookings       FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_customers  ON customers      FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_quotes     ON quote_requests FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_events     ON booking_events FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_all_staff      ON staff          FOR ALL TO authenticated USING (current_staff_role() = 'admin') WITH CHECK (current_staff_role() = 'admin');
CREATE POLICY admin_read_audit     ON audit_log      FOR SELECT TO authenticated USING (current_staff_role() = 'admin');

-- Conseiller
CREATE POLICY cons_read_activities ON activities     FOR SELECT TO authenticated USING (current_staff_role() = 'conseiller');
CREATE POLICY cons_departures      ON departures     FOR ALL    TO authenticated USING (current_staff_role() = 'conseiller') WITH CHECK (current_staff_role() = 'conseiller');
CREATE POLICY cons_bookings        ON bookings       FOR SELECT TO authenticated USING (current_staff_role() = 'conseiller');
CREATE POLICY cons_bookings_upd    ON bookings       FOR UPDATE TO authenticated USING (current_staff_role() = 'conseiller') WITH CHECK (current_staff_role() = 'conseiller');
CREATE POLICY cons_customers       ON customers      FOR ALL    TO authenticated USING (current_staff_role() = 'conseiller') WITH CHECK (current_staff_role() = 'conseiller');
CREATE POLICY cons_quotes          ON quote_requests FOR ALL    TO authenticated USING (current_staff_role() = 'conseiller') WITH CHECK (current_staff_role() = 'conseiller');
CREATE POLICY cons_events_read     ON booking_events FOR SELECT TO authenticated USING (current_staff_role() = 'conseiller');
CREATE POLICY cons_events_add      ON booking_events FOR INSERT TO authenticated WITH CHECK (current_staff_role() = 'conseiller' AND staff_id = auth.uid());
CREATE POLICY staff_read_self      ON staff          FOR SELECT TO authenticated USING (id = auth.uid());

-- Guide : seulement ses départs, leurs réservations et les clients concernés
CREATE POLICY guide_departures ON departures FOR SELECT TO authenticated
    USING (current_staff_role() = 'guide' AND guide_id = current_guide_id());
CREATE POLICY guide_bookings ON bookings FOR SELECT TO authenticated
    USING (current_staff_role() = 'guide' AND departure_id IN (SELECT id FROM departures WHERE guide_id = current_guide_id()));
CREATE POLICY guide_checkin ON bookings FOR UPDATE TO authenticated
    USING (current_staff_role() = 'guide' AND departure_id IN (SELECT id FROM departures WHERE guide_id = current_guide_id()))
    WITH CHECK (current_staff_role() = 'guide');
CREATE POLICY guide_customers ON customers FOR SELECT TO authenticated
    USING (current_staff_role() = 'guide' AND id IN (
        SELECT b.customer_id FROM bookings b JOIN departures d ON d.id = b.departure_id
        WHERE d.guide_id = current_guide_id()));

-- Un guide ne peut modifier QUE la colonne de présence
REVOKE UPDATE ON bookings FROM authenticated;
GRANT UPDATE (checked_in_at, status, notes, adults, children, departure_id, cancelled_at) ON bookings TO authenticated;
CREATE FUNCTION guide_only_checkin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF current_staff_role() = 'guide' AND
       (NEW.status, NEW.notes, NEW.adults, NEW.children, NEW.departure_id, NEW.cancelled_at)
       IS DISTINCT FROM (OLD.status, OLD.notes, OLD.adults, OLD.children, OLD.departure_id, OLD.cancelled_at) THEN
        RAISE EXCEPTION 'Un guide peut seulement pointer la présence des participants';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER bookings_guide_guard BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION guide_only_checkin();

COMMIT;
