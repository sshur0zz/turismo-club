-- Turismo Club — 15 : fonctions guide déplacées hors de l'API exposée (alerte Supabase 0029)
-- Le travail à droits élevés (SECURITY DEFINER) se fait dans le schéma private, non exposé par l'API.
-- Les fonctions publiques sont de simples relais SECURITY INVOKER : mêmes contrôles (guide connecté, ses départs seulement).
ALTER FUNCTION public.guide_departures(date, date) SET SCHEMA private;
ALTER FUNCTION public.guide_checkin(text, int, boolean) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.guide_departures(date, date), private.guide_checkin(text, int, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.guide_departures(date, date), private.guide_checkin(text, int, boolean) TO authenticated;

CREATE FUNCTION public.guide_departures(p_from date, p_to date)
RETURNS TABLE (departure_id int, starts_at timestamptz, activity text, type text, duration_minutes int, meeting_point text,
               meeting_lat numeric, meeting_lng numeric, language text, capacity int, tickets_status text, note text, participants jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
    SELECT * FROM private.guide_departures(p_from, p_to)
$$;
CREATE FUNCTION public.guide_checkin(p_kind text, p_id int, p_checked boolean)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
    SELECT private.guide_checkin(p_kind, p_id, p_checked)
$$;
REVOKE ALL ON FUNCTION public.guide_departures(date, date), public.guide_checkin(text, int, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.guide_departures(date, date), public.guide_checkin(text, int, boolean) TO authenticated;
