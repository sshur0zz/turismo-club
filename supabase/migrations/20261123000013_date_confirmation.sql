-- Turismo Club — 13 : date de confirmation d'un dossier (pour le tableau de bord : « réservations confirmées du mois »)
ALTER TABLE quote_requests ADD COLUMN confirmed_at timestamptz;
CREATE INDEX ON quote_requests (confirmed_at);

-- Rempli automatiquement la première fois qu'un dossier passe à « Confirmée » ; jamais modifiable à la main.
CREATE FUNCTION private.quote_confirmed_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.confirmed_at := CASE WHEN NEW.status IN ('won', 'done') THEN now() END;
    ELSE
        NEW.confirmed_at := OLD.confirmed_at;
        IF NEW.status IN ('won', 'done') AND OLD.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_confirmed_at() FROM public, anon, authenticated;
CREATE TRIGGER quote_confirmed_at BEFORE INSERT OR UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION private.quote_confirmed_at();

-- Dossiers déjà confirmés : date reprise de l'historique (événement « → Confirmée »)
UPDATE quote_requests q SET confirmed_at = (
    SELECT min(e.created_at) FROM booking_events e WHERE e.request_id = q.id AND e.kind = 'statut' AND e.message LIKE '%→ Confirmée')
WHERE q.status IN ('won', 'done') AND q.confirmed_at IS NULL;
