-- Turismo Club — 30 : créneaux du planning générés automatiquement (60 jours glissants)
-- Avant : les créneaux étaient créés une seule fois (migration 08) et s'arrêtaient au 19/12/2026 ;
-- les offres ajoutées le 24/11 (migration 18) n'en avaient aucun.

-- Jours de départ (ISO : 1 = lundi … 7 = dimanche). NULL = tous les jours.
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS weekdays        smallint[],
  ADD COLUMN IF NOT EXISTS weekdays_winter smallint[];
COMMENT ON COLUMN activities.weekdays        IS 'Jours de départ ISO (1 = lundi … 7 = dimanche) ; NULL = tous les jours';
COMMENT ON COLUMN activities.weekdays_winter IS 'Jours de départ de novembre à mars, s''ils diffèrent ; NULL = comme weekdays';

-- Règles écrites dans les fiches (important_info)
UPDATE activities SET weekdays = '{3}'                             WHERE slug = 'audience-papale'; -- « Every Wednesday »
UPDATE activities SET weekdays = '{1,4,5}', weekdays_winter = '{1,4}' WHERE slug = 'orvieto-assise';  -- avr.–oct. lun, jeu, ven ; nov.–mars lun, jeu

-- Crée les créneaux manquants jusqu'à J + p_days. Ne touche jamais aux créneaux existants
-- (un créneau annulé reste annulé : ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION private.generate_departures(p_days int DEFAULT 60)
RETURNS int
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE n int;
BEGIN
    INSERT INTO departures (activity_id, starts_at, capacity)
    SELECT a.id, (d::date + t::time)::timestamp AT TIME ZONE 'Europe/Rome', a.max_group_size
    FROM activities a
    CROSS JOIN generate_series((now() AT TIME ZONE 'Europe/Rome')::date + 1,
                               (now() AT TIME ZONE 'Europe/Rome')::date + p_days, interval '1 day') AS d
    CROSS JOIN LATERAL unnest(a.times) AS t
    WHERE a.is_published
      AND a.type IN ('activity', 'bus', 'circuit')
      AND extract(isodow FROM d)::smallint = ANY (
            COALESCE(CASE WHEN extract(month FROM d) IN (11, 12, 1, 2, 3) THEN a.weekdays_winter END,
                     a.weekdays, '{1,2,3,4,5,6,7}'))
    ON CONFLICT (activity_id, starts_at, language) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.generate_departures(int) FROM public, anon, authenticated;

-- Rattrapage immédiat
SELECT private.generate_departures(60);

-- Rattache aux nouveaux créneaux les prestations déjà saisies sans créneau (même méthode que la migration 14)
UPDATE request_items SET service_time = service_time WHERE departure_id IS NULL AND service_time IS NOT NULL;

-- Tous les jours à 03:15 (UTC) : on prolonge d'un jour
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'turismo-creneaux';
SELECT cron.schedule('turismo-creneaux', '15 3 * * *', $$SELECT private.generate_departures(60)$$);
