-- Turismo Club — 17 : e-mail de notification à l'agence pour chaque demande envoyée depuis le site
-- La base appelle le Worker Cloudflare (POST /notify, secret partagé), qui envoie l'e-mail à mraihiriadh@turismoclub.it.
-- L'appel est asynchrone (pg_net) : une panne d'envoi ne bloque jamais l'enregistrement de la demande.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Adresse du Worker et secret : dans private.settings (jamais dans Git, illisible depuis l'API) :
--   notify_url    = https://turismo-email-entrant.<compte>.workers.dev/notify
--   notify_secret = <secret partagé, identique à NOTIFY_SECRET du Worker>

CREATE FUNCTION private.notify_new_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE url text; secret text; offer text;
BEGIN
    SELECT value INTO url FROM private.settings WHERE key = 'notify_url';
    SELECT value INTO secret FROM private.settings WHERE key = 'notify_secret';
    IF url IS NULL OR secret IS NULL THEN RETURN NEW; END IF;
    SELECT title INTO offer FROM activities WHERE id = NEW.activity_id;
    PERFORM net.http_post(
        url := url,
        body := jsonb_build_object('id', NEW.id, 'reference', NEW.reference, 'first_name', NEW.first_name, 'last_name', NEW.last_name,
                  'email', NEW.email, 'phone', NEW.phone, 'offer_title', offer, 'date_from', NEW.date_from, 'date_to', NEW.date_to,
                  'travelers', NEW.travelers, 'language', NEW.language, 'preferred_language', NEW.preferred_language, 'message', NEW.message),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
        timeout_milliseconds := 5000);
    RETURN NEW;
EXCEPTION WHEN others THEN
    RETURN NEW; -- la demande est toujours enregistrée, même si la notification échoue
END $$;
REVOKE ALL ON FUNCTION private.notify_new_request() FROM public, anon, authenticated;

CREATE TRIGGER notify_new_request AFTER INSERT ON quote_requests
  FOR EACH ROW WHEN (NEW.source = 'site') EXECUTE FUNCTION private.notify_new_request();
