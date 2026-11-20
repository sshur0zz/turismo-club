-- Turismo Club — 09 : demandes de réservation réelles depuis le site (sans paiement en ligne)
-- Appliqué sur Supabase le 2026-11-20.
-- Le site envoie chaque demande dans quote_requests ; le patron les consulte dans le tableau de bord Supabase.

ALTER TABLE quote_requests ADD COLUMN offer_slug text
  CHECK (offer_slug IS NULL OR char_length(offer_slug) <= 100);        -- offre demandée (slug du site) ou 'sur-mesure'
ALTER TABLE quote_requests ADD COLUMN preferred_language text
  CHECK (preferred_language IS NULL OR preferred_language IN ('en','it','fr','es','de','pt','nl','zh','ja','ko'));
ALTER TABLE quote_requests ADD COLUMN consent_at timestamptz;           -- date du consentement RGPD (case cochée)

COMMENT ON COLUMN quote_requests.language IS 'Langue du site au moment de la demande';
COMMENT ON COLUMN quote_requests.preferred_language IS 'Langue dans laquelle le client souhaite être recontacté';

-- Règle d'insertion publique plus stricte : consentement obligatoire, tailles limitées.
-- Les visiteurs (anon) peuvent toujours insérer, mais ne peuvent toujours rien lire.
DROP POLICY public_insert_quote ON quote_requests;
CREATE POLICY public_insert_quote ON quote_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
        status = 'new' AND assigned_staff_id IS NULL AND source = 'site'
    AND consent_at IS NOT NULL
    AND char_length(first_name) BETWEEN 1 AND 200
    AND char_length(coalesce(last_name, '')) <= 200
    AND char_length(email::text) <= 200
    AND char_length(coalesce(phone, '')) <= 50
    AND char_length(coalesce(message, '')) <= 2000
    AND (travelers IS NULL OR travelers BETWEEN 1 AND 99)
    AND cardinality(interests) <= 10
    AND budget_cents IS NULL
  );
