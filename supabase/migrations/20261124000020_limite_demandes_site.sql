-- Turismo Club — 20 : limite de débit des demandes envoyées depuis le site (audit SEC-003)
-- Un robot ne doit pas pouvoir remplir la base ni inonder la boîte de l'agence (1 notification par demande).
-- Deux plafonds, réglables dans private.settings (aucune valeur dans le code) :
--   site_requests_per_hour             : toutes demandes du site confondues, sur 1 heure glissante
--   site_requests_per_contact_per_hour : par même e-mail ou même téléphone, sur 1 heure glissante
-- Au-delà, l'insertion est refusée : le site affiche alors les boutons WhatsApp / e-mail (rien n'est perdu pour un vrai client).

INSERT INTO private.settings (key, value) VALUES
  ('site_requests_per_hour', '60'),
  ('site_requests_per_contact_per_hour', '5')
ON CONFLICT (key) DO NOTHING;

CREATE FUNCTION private.quote_rate_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE max_all int; max_contact int;
BEGIN
    SELECT value::int INTO max_all FROM private.settings WHERE key = 'site_requests_per_hour';
    SELECT value::int INTO max_contact FROM private.settings WHERE key = 'site_requests_per_contact_per_hour';
    IF max_all IS NOT NULL AND
       (SELECT count(*) FROM quote_requests WHERE source = 'site' AND created_at > now() - interval '1 hour') >= max_all THEN
        RAISE EXCEPTION 'Trop de demandes en ce moment, réessayez plus tard' USING ERRCODE = '54000';
    END IF;
    IF max_contact IS NOT NULL AND
       (SELECT count(*) FROM quote_requests
         WHERE source = 'site' AND created_at > now() - interval '1 hour'
           AND ((NEW.email IS NOT NULL AND email = NEW.email) OR (NEW.phone IS NOT NULL AND phone = NEW.phone))) >= max_contact THEN
        RAISE EXCEPTION 'Trop de demandes pour ce contact, réessayez plus tard' USING ERRCODE = '54000';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_rate_limit() FROM public, anon, authenticated;

CREATE TRIGGER quote_rate_limit BEFORE INSERT ON quote_requests
  FOR EACH ROW WHEN (NEW.source = 'site') EXECUTE FUNCTION private.quote_rate_limit();

-- Index pour garder ces comptages rapides
CREATE INDEX IF NOT EXISTS quote_requests_site_recent ON quote_requests (created_at) WHERE source = 'site';
