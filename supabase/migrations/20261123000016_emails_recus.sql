-- Turismo Club — 16 : e-mails reçus (transférés par Gmail → Cloudflare Email Routing → Worker → cette table)
-- Le Worker n'a AUCUNE clé de la base : il appelle ingest_email() avec un secret partagé (gardé dans private.config
-- et dans les secrets du Worker, jamais dans Git). Admin et conseillers lisent et traitent les e-mails ; personne d'autre.

CREATE TABLE inbound_emails (
    id           bigserial PRIMARY KEY,
    received_at  timestamptz NOT NULL DEFAULT now(),
    message_id   text UNIQUE CHECK (message_id IS NULL OR char_length(message_id) <= 500),
    from_name    text CHECK (from_name IS NULL OR char_length(from_name) <= 200),
    from_email   text NOT NULL CHECK (char_length(from_email) <= 320),
    to_address   text CHECK (to_address IS NULL OR char_length(to_address) <= 320),
    subject      text CHECK (subject IS NULL OR char_length(subject) <= 500),
    body_text    text CHECK (body_text IS NULL OR char_length(body_text) <= 100000),
    attachments  int  NOT NULL DEFAULT 0 CHECK (attachments >= 0),
    status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done', 'ignored')),
    request_id   int REFERENCES quote_requests(id) ON DELETE SET NULL,
    handled_by   uuid REFERENCES staff(id) ON DELETE SET NULL,
    handled_at   timestamptz
);
CREATE INDEX ON inbound_emails (status, received_at DESC);
CREATE INDEX ON inbound_emails (lower(from_email));

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_read_emails ON inbound_emails FOR SELECT TO authenticated
  USING (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE POLICY team_update_emails ON inbound_emails FOR UPDATE TO authenticated
  USING (private.current_staff_role() IN ('admin', 'conseiller'))
  WITH CHECK (private.current_staff_role() IN ('admin', 'conseiller'));
CREATE POLICY admin_delete_emails ON inbound_emails FOR DELETE TO authenticated
  USING (private.current_staff_role() = 'admin');
REVOKE ALL ON inbound_emails FROM anon, public;
GRANT SELECT, UPDATE, DELETE ON inbound_emails TO authenticated;

-- Traçabilité : qui a traité l'e-mail et quand (rempli par la base, pas par l'écran)
CREATE FUNCTION private.email_handled() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.request_id IS DISTINCT FROM OLD.request_id THEN
        NEW.handled_by := auth.uid(); NEW.handled_at := now();
    END IF;
    -- Contenu reçu : jamais modifiable depuis l'espace équipe
    NEW.message_id := OLD.message_id; NEW.from_name := OLD.from_name; NEW.from_email := OLD.from_email;
    NEW.to_address := OLD.to_address; NEW.subject := OLD.subject; NEW.body_text := OLD.body_text;
    NEW.received_at := OLD.received_at; NEW.attachments := OLD.attachments;
    RETURN NEW;
END $$;
CREATE TRIGGER email_handled BEFORE UPDATE ON inbound_emails FOR EACH ROW EXECUTE FUNCTION private.email_handled();
REVOKE ALL ON FUNCTION private.email_handled() FROM public, anon, authenticated;
CREATE TRIGGER audit_inbound_emails AFTER UPDATE OR DELETE ON inbound_emails FOR EACH ROW EXECUTE FUNCTION write_audit();

-- Dépôt d'un e-mail par le Worker Cloudflare : uniquement avec le bon secret partagé.
-- La base ne garde que l'empreinte SHA-256 du secret (private.settings, illisible depuis l'API) ;
-- le secret lui-même n'existe que dans les secrets du Worker.
CREATE TABLE private.settings (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.settings FROM public, anon, authenticated;

CREATE FUNCTION private.ingest_email(p_secret text, p_message_id text, p_from_name text, p_from_email text, p_to text,
                                     p_subject text, p_body text, p_attachments int)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE expected text; new_id bigint;
BEGIN
    SELECT value INTO expected FROM private.settings WHERE key = 'email_ingest_sha256';
    IF expected IS NULL OR p_secret IS NULL OR encode(extensions.digest(p_secret, 'sha256'), 'hex') <> expected THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;
    IF p_from_email IS NULL OR p_from_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN RAISE EXCEPTION 'invalid sender'; END IF;
    -- Anti-abus : au plus 300 e-mails par heure
    IF (SELECT count(*) FROM inbound_emails WHERE received_at > now() - interval '1 hour') >= 300 THEN RAISE EXCEPTION 'rate limit'; END IF;
    INSERT INTO inbound_emails (message_id, from_name, from_email, to_address, subject, body_text, attachments)
    VALUES (left(nullif(p_message_id, ''), 500), left(nullif(trim(p_from_name), ''), 200), lower(left(p_from_email, 320)), left(p_to, 320),
            left(p_subject, 500), left(p_body, 100000), greatest(coalesce(p_attachments, 0), 0))
    ON CONFLICT (message_id) DO NOTHING
    RETURNING id INTO new_id;
    RETURN coalesce(new_id, 0); -- 0 = déjà reçu (même Message-ID)
END $$;
REVOKE ALL ON FUNCTION private.ingest_email(text, text, text, text, text, text, text, int) FROM public, authenticated;
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.ingest_email(text, text, text, text, text, text, text, int) TO anon;

-- Relais public (SECURITY INVOKER) appelé par le Worker avec la clé publique
CREATE FUNCTION public.ingest_email(p_secret text, p_message_id text, p_from_name text, p_from_email text, p_to text,
                                    p_subject text, p_body text, p_attachments int)
RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
    SELECT private.ingest_email(p_secret, p_message_id, p_from_name, p_from_email, p_to, p_subject, p_body, p_attachments)
$$;
REVOKE ALL ON FUNCTION public.ingest_email(text, text, text, text, text, text, text, int) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_email(text, text, text, text, text, text, text, int) TO anon;

-- Direct dans l'espace équipe
ALTER PUBLICATION supabase_realtime ADD TABLE inbound_emails;
-- L'empreinte du secret est enregistrée à part (jamais dans Git) :
--   INSERT INTO private.settings (key, value) VALUES ('email_ingest_sha256', '<empreinte>') ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
