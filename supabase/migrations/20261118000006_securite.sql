-- Turismo Club — 06 : fonctions internes hors de l'API publique, vues publiques sans accès aux lignes clients
-- Appliqué sur Supabase le 2026-11-18. Résultat : 0 alerte de sécurité Supabase.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
ALTER FUNCTION public.current_staff_role() SET SCHEMA private;
ALTER FUNCTION public.current_guide_id()   SET SCHEMA private;
ALTER FUNCTION private.current_staff_role() SET search_path = public;
ALTER FUNCTION private.current_guide_id()   SET search_path = public;
REVOKE EXECUTE ON FUNCTION private.current_staff_role(), private.current_guide_id() FROM public, anon;
GRANT  EXECUTE ON FUNCTION private.current_staff_role(), private.current_guide_id() TO authenticated;
CREATE OR REPLACE FUNCTION public.guide_only_checkin() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF private.current_staff_role() = 'guide' AND
       (NEW.status, NEW.notes, NEW.adults, NEW.children, NEW.departure_id, NEW.cancelled_at)
       IS DISTINCT FROM (OLD.status, OLD.notes, OLD.adults, OLD.children, OLD.departure_id, OLD.cancelled_at) THEN
        RAISE EXCEPTION 'Un guide peut seulement pointer la présence des participants';
    END IF;
    RETURN NEW;
END $$;
CREATE FUNCTION private.seats_taken(p_departure int) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT coalesce(sum(adults + children), 0)::int FROM bookings
    WHERE departure_id = p_departure AND status IN ('pending', 'confirmed')
$$;
CREATE FUNCTION private.confirmed_bookings(p_activity int) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT count(*) FROM bookings b JOIN departures dp ON dp.id = b.departure_id
    WHERE dp.activity_id = p_activity AND b.status = 'confirmed'
$$;
REVOKE EXECUTE ON FUNCTION private.seats_taken(int), private.confirmed_bookings(int) FROM public;
GRANT  EXECUTE ON FUNCTION private.seats_taken(int), private.confirmed_bookings(int) TO anon, authenticated;
DROP VIEW public.activity_cards;
DROP VIEW public.departure_availability;
CREATE VIEW public.activity_cards WITH (security_invoker = true) AS
SELECT a.id, a.slug, a.title, a.summary, a.duration_minutes, a.format,
       a.price_adult_cents, a.badge,
       d.slug AS destination_slug, d.name AS destination_name,
       round(avg(r.rating), 1) AS rating_avg,
       count(DISTINCT r.id)    AS review_count,
       private.confirmed_bookings(a.id) AS bookings_count,
       (SELECT url FROM activity_photos p WHERE p.activity_id = a.id ORDER BY position LIMIT 1) AS cover_url
FROM activities a
JOIN destinations d ON d.id = a.destination_id
LEFT JOIN reviews r ON r.activity_id = a.id AND r.is_published
WHERE a.is_published
GROUP BY a.id, d.id;
CREATE VIEW public.departure_availability WITH (security_invoker = true) AS
SELECT dp.id, dp.activity_id, dp.starts_at, dp.language, dp.capacity,
       dp.capacity - private.seats_taken(dp.id) AS seats_left
FROM departures dp
WHERE dp.status = 'open' AND dp.starts_at > now();
GRANT SELECT ON public.activity_cards, public.departure_availability TO anon, authenticated;
