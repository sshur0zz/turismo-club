-- Turismo Club — 14 : planning, guides et vue guide (phases B et C)

-- ============ 0. Données de démonstration retirées (aucune fausse personne affichée) ============
DELETE FROM bookings WHERE reference = 'TC-91DDEAF3';
DELETE FROM customers c WHERE c.email = 'test@example.com' AND c.first_name = 'Client'
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.customer_id = c.id);
UPDATE departures SET guide_id = NULL WHERE guide_id IN (SELECT id FROM guides WHERE first_name LIKE '[Guide %');
DELETE FROM guides g WHERE g.first_name LIKE '[Guide %' AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.guide_id = g.id);

-- ============ 1. Offres, départs, guides ============
ALTER TABLE activities ADD COLUMN min_participants int CHECK (min_participants IS NULL OR min_participants >= 1);
ALTER TABLE departures
  ADD COLUMN tickets_status text NOT NULL DEFAULT 'na' CHECK (tickets_status IN ('na', 'a_acheter', 'achetes')),
  ADD COLUMN note text CHECK (note IS NULL OR char_length(note) <= 1000);
CREATE INDEX IF NOT EXISTS departures_starts_at_idx ON departures (starts_at);
CREATE INDEX IF NOT EXISTS departures_guide_idx ON departures (guide_id, starts_at);
ALTER TABLE guides ADD CONSTRAINT guides_name_len CHECK (char_length(first_name) BETWEEN 1 AND 100);

-- Disponibilités indiquées par les guides (jours libres / pas libres)
CREATE TABLE guide_availability (
    guide_id  int  NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    day       date NOT NULL,
    available boolean NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (guide_id, day)
);

-- ============ 2. Lien prestation → départ (remplissage du planning) ============
ALTER TABLE request_items
  ADD COLUMN departure_id  int REFERENCES departures(id) ON DELETE SET NULL,
  ADD COLUMN checked_in_at timestamptz;
CREATE INDEX ON request_items (departure_id);

-- Une prestation avec offre + date + heure est rattachée automatiquement au départ correspondant.
CREATE FUNCTION private.item_link_departure() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.activity_id IS NOT NULL AND NEW.service_date IS NOT NULL AND NEW.service_time IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.departure_id IS NOT DISTINCT FROM OLD.departure_id) THEN
        SELECT d.id INTO NEW.departure_id FROM departures d
        WHERE d.activity_id = NEW.activity_id AND d.status <> 'cancelled'
          AND (d.starts_at AT TIME ZONE 'Europe/Rome')::date = NEW.service_date
          AND to_char(d.starts_at AT TIME ZONE 'Europe/Rome', 'HH24:MI') = NEW.service_time
        ORDER BY d.id LIMIT 1;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER item_link_departure BEFORE INSERT OR UPDATE ON request_items FOR EACH ROW EXECUTE FUNCTION private.item_link_departure();
UPDATE request_items SET service_time = service_time WHERE departure_id IS NULL; -- rattache les lignes existantes

-- ============ 3. Vue guide : seulement SES départs, participants sans montants ni coordonnées ============
-- Le guide ne lit plus directement réservations et clients (montants, e-mails, téléphones) : il passe par ces fonctions.
DROP POLICY IF EXISTS guide_bookings ON bookings;
DROP POLICY IF EXISTS guide_checkin ON bookings;
DROP POLICY IF EXISTS guide_customers ON customers;

CREATE FUNCTION public.guide_departures(p_from date, p_to date)
RETURNS TABLE (departure_id int, starts_at timestamptz, activity text, type text, duration_minutes int, meeting_point text,
               meeting_lat numeric, meeting_lng numeric, language text, capacity int, tickets_status text, note text, participants jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT d.id, d.starts_at, a.title, a.type, a.duration_minutes, a.meeting_point, a.meeting_lat, a.meeting_lng,
           d.language, d.capacity, d.tickets_status, d.note,
           coalesce((
             SELECT jsonb_agg(p ORDER BY p->>'name') FROM (
               SELECT jsonb_build_object('kind', 'b', 'id', b.id, 'name', c.first_name || ' ' || left(c.last_name, 1) || '.',
                        'people', b.adults + b.children, 'language', c.locale, 'note', b.notes, 'checked', b.checked_in_at IS NOT NULL) p
               FROM bookings b JOIN customers c ON c.id = b.customer_id
               WHERE b.departure_id = d.id AND b.status IN ('pending', 'confirmed')
               UNION ALL
               SELECT jsonb_build_object('kind', 'i', 'id', i.id, 'name', q.first_name || coalesce(' ' || left(q.last_name, 1) || '.', ''),
                        'people', i.people, 'language', coalesce(q.preferred_language, q.language), 'note', q.internal_note, 'checked', i.checked_in_at IS NOT NULL)
               FROM request_items i JOIN quote_requests q ON q.id = i.request_id
               WHERE i.departure_id = d.id AND q.status IN ('won', 'done')
             ) x), '[]'::jsonb)
    FROM departures d JOIN activities a ON a.id = d.activity_id
    WHERE d.guide_id = private.current_guide_id() AND private.current_staff_role() = 'guide'
      AND (d.starts_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_from AND p_to
      AND p_to - p_from <= 62
    ORDER BY d.starts_at
$$;

-- Pointage à l'arrivée (uniquement sur un départ du guide connecté)
CREATE FUNCTION public.guide_checkin(p_kind text, p_id int, p_checked boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g int := private.current_guide_id(); dep int; req int;
BEGIN
    IF private.current_staff_role() <> 'guide' OR g IS NULL THEN RAISE EXCEPTION 'Réservé aux guides'; END IF;
    IF p_kind = 'b' THEN
        SELECT b.departure_id INTO dep FROM bookings b JOIN departures d ON d.id = b.departure_id WHERE b.id = p_id AND d.guide_id = g;
        IF dep IS NULL THEN RAISE EXCEPTION 'Participant introuvable'; END IF;
        UPDATE bookings SET checked_in_at = CASE WHEN p_checked THEN now() END WHERE id = p_id;
    ELSIF p_kind = 'i' THEN
        SELECT i.departure_id, i.request_id INTO dep, req FROM request_items i JOIN departures d ON d.id = i.departure_id WHERE i.id = p_id AND d.guide_id = g;
        IF dep IS NULL THEN RAISE EXCEPTION 'Participant introuvable'; END IF;
        UPDATE request_items SET checked_in_at = CASE WHEN p_checked THEN now() END WHERE id = p_id;
        INSERT INTO booking_events (request_id, staff_id, kind, message)
        VALUES (req, auth.uid(), 'pointage', CASE WHEN p_checked THEN 'Arrivée pointée par le guide' ELSE 'Pointage annulé par le guide' END);
    ELSE
        RAISE EXCEPTION 'Type inconnu';
    END IF;
    RETURN p_checked;
END $$;

REVOKE ALL ON FUNCTION public.guide_departures(date, date), public.guide_checkin(text, int, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.guide_departures(date, date), public.guide_checkin(text, int, boolean) TO authenticated;
REVOKE ALL ON FUNCTION private.item_link_departure() FROM public, anon, authenticated;

-- ============ 4. Droits ============
-- Guides : plus de lecture publique (noms des guides) ; l'équipe les voit, l'admin les gère, un guide voit sa fiche
DROP POLICY IF EXISTS public_read_guides ON guides;
CREATE POLICY team_read_guides ON guides FOR SELECT TO authenticated USING (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE POLICY guide_read_self ON guides FOR SELECT TO authenticated USING (id = private.current_guide_id());
REVOKE ALL ON guides FROM anon;

ALTER TABLE guide_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_read_avail ON guide_availability FOR SELECT TO authenticated USING (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE POLICY guide_own_avail ON guide_availability FOR ALL TO authenticated
  USING (private.current_staff_role() = 'guide' AND guide_id = private.current_guide_id())
  WITH CHECK (private.current_staff_role() = 'guide' AND guide_id = private.current_guide_id());
REVOKE ALL ON guide_availability FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON guide_availability TO authenticated;

-- Départs : les visiteurs ne lisent plus les départs (le site public ne s'en sert pas)
DROP POLICY IF EXISTS public_read_departures ON departures;
REVOKE ALL ON departures FROM anon;

