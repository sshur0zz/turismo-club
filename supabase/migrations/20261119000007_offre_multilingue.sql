-- Turismo Club — 07 : offre en 5 types (activité, bus, circuit, hôtel, restaurant), demandes publiques
-- Appliqué sur Supabase le 2026-11-19.
ALTER TABLE activities ADD COLUMN type text NOT NULL DEFAULT 'activity'
  CHECK (type IN ('activity', 'bus', 'circuit', 'hotel', 'restaurant'));
ALTER TABLE activities ADD COLUMN title_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE activities ADD COLUMN summary_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE activities ADD COLUMN times text[] NOT NULL DEFAULT '{}';
ALTER TABLE activities ALTER COLUMN duration_minutes DROP NOT NULL;
ALTER TABLE quote_requests ADD COLUMN language text NOT NULL DEFAULT 'en';
ALTER TABLE quote_requests ADD COLUMN source text NOT NULL DEFAULT 'site'
  CHECK (source IN ('site', 'telephone', 'whatsapp', 'email', 'agence'));
ALTER TABLE quote_requests ADD COLUMN activity_id int REFERENCES activities(id);
CREATE POLICY public_insert_quote ON quote_requests FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new' AND assigned_staff_id IS NULL AND source = 'site'
              AND char_length(coalesce(message, '')) <= 2000);
GRANT INSERT ON quote_requests TO anon;
CREATE VIEW public.site_offers WITH (security_invoker = true) AS
SELECT a.slug, a.type, d.slug AS destination, a.price_adult_cents, a.price_child_cents,
       a.is_published, a.title_i18n, a.summary_i18n, a.times, a.updated_at
FROM activities a JOIN destinations d ON d.id = a.destination_id
WHERE a.is_published;
GRANT SELECT ON public.site_offers TO anon, authenticated;
