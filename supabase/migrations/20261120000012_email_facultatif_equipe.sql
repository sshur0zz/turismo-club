-- Turismo Club — 12 : demande saisie par l'équipe (téléphone, WhatsApp, agence) sans e-mail
-- L'e-mail devient facultatif dans la base ; le site public reste obligé d'en fournir un
-- (la règle public_insert_quote échoue si email est NULL, car char_length(NULL) <= 200 n'est pas vrai).
ALTER TABLE quote_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_contact CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Client retrouvé par e-mail, sinon par téléphone ; créé s'il n'existe pas.
CREATE OR REPLACE FUNCTION private.quote_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_staff boolean := private.current_staff_role() IS NOT NULL;
BEGIN
    IF NOT is_staff THEN
        NEW.customer_id := NULL; NEW.internal_note := NULL;
    END IF;
    NEW.reference := 'TC-' || to_char(now() AT TIME ZONE 'Europe/Rome', 'YYMM') || '-' || lpad(NEW.id::text, 3, '0');
    IF NEW.activity_id IS NULL AND NEW.offer_slug IS NOT NULL THEN
        SELECT id INTO NEW.activity_id FROM activities WHERE slug = NEW.offer_slug;
    END IF;
    IF NEW.customer_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT id INTO NEW.customer_id FROM customers WHERE email = NEW.email;
    END IF;
    IF NEW.customer_id IS NULL AND NEW.phone IS NOT NULL THEN
        SELECT id INTO NEW.customer_id FROM customers
        WHERE regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g') LIMIT 1;
    END IF;
    IF NEW.customer_id IS NULL THEN
        INSERT INTO customers (email, first_name, last_name, phone, locale)
        VALUES (NEW.email, NEW.first_name, coalesce(NEW.last_name, ''), NEW.phone, coalesce(NEW.preferred_language, NEW.language, 'en'))
        RETURNING id INTO NEW.customer_id;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.quote_before_insert() FROM public, anon, authenticated;
