-- Turismo Club — 31 : disponibilités lisibles par le site public (calendrier des fiches)
-- Le site ne lit toujours pas la table departures (migration 14). Il appelle une fonction qui ne renvoie
-- que l'heure de départ et le nombre de places restantes d'une offre publiée : ni guide, ni client, ni montant.
-- Places prises = réservations (en attente ou confirmées) + prestations des dossiers non perdus, comme le planning.

CREATE FUNCTION private.offer_availability(p_slug text, p_days int DEFAULT 60)
RETURNS TABLE (starts_at timestamptz, seats_left int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT dp.starts_at,
           GREATEST(0, sum(dp.capacity
             - COALESCE((SELECT sum(b.adults + b.children) FROM bookings b
                         WHERE b.departure_id = dp.id AND b.status IN ('pending', 'confirmed')), 0)
             - COALESCE((SELECT sum(ri.people) FROM request_items ri JOIN quote_requests q ON q.id = ri.request_id
                         WHERE ri.departure_id = dp.id AND q.status <> 'lost'), 0)))::int
    FROM departures dp
    JOIN activities a ON a.id = dp.activity_id
    WHERE a.slug = p_slug AND a.is_published
      AND dp.status = 'open'
      AND dp.starts_at > now()
      AND dp.starts_at < now() + make_interval(days => LEAST(GREATEST(p_days, 1), 90))
    GROUP BY dp.starts_at
    ORDER BY dp.starts_at
$$;
REVOKE ALL ON FUNCTION private.offer_availability(text, int) FROM public;
GRANT EXECUTE ON FUNCTION private.offer_availability(text, int) TO anon, authenticated;

CREATE FUNCTION public.offer_availability(p_slug text, p_days int DEFAULT 60)
RETURNS TABLE (starts_at timestamptz, seats_left int)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT * FROM private.offer_availability(p_slug, p_days)
$$;
REVOKE ALL ON FUNCTION public.offer_availability(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.offer_availability(text, int) TO anon, authenticated;
