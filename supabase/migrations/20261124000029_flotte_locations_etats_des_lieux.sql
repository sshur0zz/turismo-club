-- Turismo Club — 29 : lot 4 « Flotte, locations, états des lieux et dégâts » (matrice des écarts, lignes 13, 14, 15)
-- Toutes les valeurs métier (prix, km inclus, cautions, âges, délais) sont saisies par l'agence ; aucune n'est inventée.
-- Garde-fous dans la base : pas de chevauchement de locations, kilométrage jamais décroissant, total calculé par le serveur,
-- contrôles du permis, état des lieux figé après signature.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ---------- Réglages, lieux, distances, options ----------
INSERT INTO private.settings (key, value) VALUES ('rental_reposition_hours', '48') ON CONFLICT (key) DO NOTHING;  -- délai avant remise ailleurs (réglable)

CREATE TABLE rental_locations (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 120),
    address text CHECK (address IS NULL OR char_length(address) <= 300),
    is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE rental_location_distances (
    from_id integer NOT NULL REFERENCES rental_locations(id) ON DELETE CASCADE,
    to_id integer NOT NULL REFERENCES rental_locations(id) ON DELETE CASCADE,
    km integer NOT NULL CHECK (km >= 0),
    PRIMARY KEY (from_id, to_id), CHECK (from_id <> to_id)
);
CREATE TABLE rental_extras (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 120),
    icon text,                                                         -- code de la bibliothèque d'icônes
    price_cents integer NOT NULL CHECK (price_cents >= 0),
    per text NOT NULL CHECK (per IN ('day', 'rental')),
    is_active boolean NOT NULL DEFAULT true
);

-- ---------- Véhicules ----------
CREATE TABLE vehicles (
    id serial PRIMARY KEY,
    plate text NOT NULL CHECK (plate ~ '^[A-Z0-9 -]{4,12}$'),
    vin text CHECK (vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
    make text NOT NULL CHECK (char_length(make) BETWEEN 1 AND 60),
    model text NOT NULL CHECK (char_length(model) BETWEEN 1 AND 60),
    category text NOT NULL CHECK (category IN ('mini', 'economy', 'compact', 'intermediate', 'suv', 'van', 'minibus', 'luxury')),
    transmission text NOT NULL CHECK (transmission IN ('manual', 'automatic')),
    fuel text NOT NULL CHECK (fuel IN ('petrol', 'diesel', 'hybrid', 'electric', 'lpg')),
    seats smallint NOT NULL CHECK (seats BETWEEN 1 AND 60),
    power_hp smallint CHECK (power_hp IS NULL OR power_hp BETWEEN 1 AND 2000),
    features text[] NOT NULL DEFAULT '{}' CHECK (cardinality(features) <= 40),       -- codes de la bibliothèque d'icônes
    fuel_policy text NOT NULL DEFAULT 'full_to_full' CHECK (fuel_policy IN ('full_to_full', 'same_to_same')),
    odometer_km integer NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    home_location_id integer REFERENCES rental_locations(id),
    last_location_id integer REFERENCES rental_locations(id),
    -- formules : forfait (prix/jour + km inclus/jour + prix du km supplémentaire) et/ou kilométrage (prix/jour + prix au km)
    daily_price_cents integer CHECK (daily_price_cents IS NULL OR daily_price_cents >= 0),
    included_km_per_day integer CHECK (included_km_per_day IS NULL OR included_km_per_day >= 0),
    extra_km_cents integer CHECK (extra_km_cents IS NULL OR extra_km_cents >= 0),
    km_daily_price_cents integer CHECK (km_daily_price_cents IS NULL OR km_daily_price_cents >= 0),
    per_km_cents integer CHECK (per_km_cents IS NULL OR per_km_cents >= 0),
    relocation_per_km_cents integer CHECK (relocation_per_km_cents IS NULL OR relocation_per_km_cents >= 0),
    deposit_cents integer CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
    min_driver_age smallint CHECK (min_driver_age IS NULL OR min_driver_age BETWEEN 16 AND 99),
    min_license_years smallint CHECK (min_license_years IS NULL OR min_license_years BETWEEN 0 AND 50),
    license_category text NOT NULL DEFAULT 'B' CHECK (license_category IN ('AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C', 'D1', 'D')),
    photo_paths text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photo_paths) <= 20),
    is_active boolean NOT NULL DEFAULT true,
    notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vehicles_plate ON vehicles (upper(replace(replace(plate, ' ', ''), '-', '')));   -- immatriculation unique
CREATE TABLE vehicle_documents (
    id serial PRIMARY KEY,
    vehicle_id integer NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('insurance', 'registration', 'inspection', 'road_tax', 'other')),
    expires_on date,
    note text CHECK (note IS NULL OR char_length(note) <= 500)
);
CREATE TABLE vehicle_maintenance (
    id serial PRIMARY KEY,
    vehicle_id integer NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    planned_on date, done_on date,
    km integer CHECK (km IS NULL OR km >= 0),
    cost_cents integer CHECK (cost_cents IS NULL OR cost_cents >= 0),
    note text CHECK (note IS NULL OR char_length(note) <= 1000)
);
CREATE TABLE vehicle_odometer (
    id serial PRIMARY KEY,
    vehicle_id integer NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    km integer NOT NULL CHECK (km >= 0),
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'departure', 'return', 'maintenance')),
    read_at timestamptz NOT NULL DEFAULT now()
);
-- Kilométrage jamais décroissant ; le relevé met à jour le compteur du véhicule
CREATE FUNCTION private.odometer_check() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.km < (SELECT odometer_km FROM vehicles WHERE id = NEW.vehicle_id) THEN
        RAISE EXCEPTION 'Le kilométrage ne peut pas diminuer (compteur actuel : % km)', (SELECT odometer_km FROM vehicles WHERE id = NEW.vehicle_id) USING ERRCODE = 'P0409';
    END IF;
    UPDATE vehicles SET odometer_km = NEW.km, updated_at = now() WHERE id = NEW.vehicle_id;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.odometer_check() FROM public, anon, authenticated;
CREATE TRIGGER odometer_check BEFORE INSERT ON vehicle_odometer FOR EACH ROW EXECUTE FUNCTION private.odometer_check();
CREATE FUNCTION private.vehicle_no_rollback() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.odometer_km < OLD.odometer_km THEN RAISE EXCEPTION 'Le kilométrage ne peut pas diminuer' USING ERRCODE = 'P0409'; END IF;
    NEW.updated_at := now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.vehicle_no_rollback() FROM public, anon, authenticated;
CREATE TRIGGER vehicle_no_rollback BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION private.vehicle_no_rollback();

-- ---------- Contrats de location ----------
CREATE TABLE rental_counters (year integer PRIMARY KEY, last integer NOT NULL DEFAULT 0);
ALTER TABLE rental_counters SET SCHEMA private;
REVOKE ALL ON private.rental_counters FROM public, anon, authenticated;

CREATE TABLE rental_contracts (
    id serial PRIMARY KEY,
    reference text UNIQUE,
    vehicle_id integer NOT NULL REFERENCES vehicles(id),
    customer_id integer NOT NULL REFERENCES customers(id),          -- clients existants de l'agence
    request_id integer REFERENCES quote_requests(id),
    status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'active', 'returned', 'cancelled')),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    pickup_location_id integer REFERENCES rental_locations(id),
    return_location_id integer REFERENCES rental_locations(id),
    formula text NOT NULL CHECK (formula IN ('flat', 'km')),
    -- conducteur et permis
    driver_name text NOT NULL CHECK (char_length(driver_name) BETWEEN 1 AND 200),
    driver_birthdate date NOT NULL,
    license_number text NOT NULL CHECK (char_length(license_number) BETWEEN 3 AND 40),
    license_category text NOT NULL CHECK (license_category IN ('AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C', 'D1', 'D')),
    license_issued_on date NOT NULL,
    license_expires_on date NOT NULL,
    license_original_checked boolean NOT NULL DEFAULT false,        -- original vérifié avant la remise des clés
    second_driver_name text CHECK (second_driver_name IS NULL OR char_length(second_driver_name) <= 200),
    -- prix figés à la réservation (calculés par la base)
    days integer, daily_price_cents integer, included_km_per_day integer, extra_km_cents integer, per_km_cents integer,
    extras jsonb NOT NULL DEFAULT '[]',                              -- [{id, qty}] demandé → figé avec nom et prix par la base
    relocation_cents integer NOT NULL DEFAULT 0,
    base_total_cents integer,
    deposit_cents integer CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
    -- au retour (saisi par l'agent ; aucun barème)
    km_start integer, km_end integer, fuel_start smallint, fuel_end smallint,
    km_fee_cents integer NOT NULL DEFAULT 0, fuel_fee_cents integer NOT NULL DEFAULT 0 CHECK (fuel_fee_cents >= 0),
    damage_fee_cents integer NOT NULL DEFAULT 0 CHECK (damage_fee_cents >= 0),
    total_cents integer,
    notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
    created_by uuid REFERENCES staff(id) DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    -- pas deux locations qui se chevauchent sur le même véhicule
    CONSTRAINT rental_no_overlap EXCLUDE USING gist (vehicle_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')
);
CREATE INDEX rental_contracts_vehicle ON rental_contracts (vehicle_id, starts_at);

-- Calcul serveur : jours = tranches de 24 h entamées ; prix figés ; options figées ; contrôles du permis ; transitions
CREATE FUNCTION private.rental_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v vehicles; e jsonb; x rental_extras; ex jsonb := '[]'; ext bigint := 0; q int; km int; drv_age int; yrs int; relo int := 0; reposition int;
BEGIN
    SELECT * INTO v FROM vehicles WHERE id = NEW.vehicle_id;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('returned', 'cancelled') AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.starts_at <> OLD.starts_at OR NEW.ends_at <> OLD.ends_at) THEN
            RAISE EXCEPTION 'Contrat clos : modification impossible' USING ERRCODE = 'P0409'; END IF;
        IF NEW.status <> OLD.status AND NOT ((OLD.status = 'booked' AND NEW.status IN ('active', 'cancelled')) OR (OLD.status = 'active' AND NEW.status = 'returned')) THEN
            RAISE EXCEPTION 'Transition interdite (annulation possible seulement avant le départ)' USING ERRCODE = 'P0409'; END IF;
        IF OLD.status <> 'booked' AND (NEW.starts_at <> OLD.starts_at OR NEW.vehicle_id <> OLD.vehicle_id OR NEW.formula <> OLD.formula OR NEW.extras <> OLD.extras) THEN
            RAISE EXCEPTION 'Réservation modifiable seulement avant le départ' USING ERRCODE = 'P0409'; END IF;
        IF NEW.status = 'active' AND OLD.status = 'booked' AND NOT NEW.license_original_checked THEN
            RAISE EXCEPTION 'Vérifiez l''original du permis avant la remise des clés' USING ERRCODE = 'P0409'; END IF;
        IF NEW.status = 'active' AND OLD.status = 'booked' AND NOT EXISTS (SELECT 1 FROM inspections WHERE contract_id = NEW.id AND kind = 'departure' AND signed_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Signez l''état des lieux de départ avant la remise des clés' USING ERRCODE = 'P0409'; END IF;
        IF NEW.status = 'returned' AND NOT EXISTS (SELECT 1 FROM inspections WHERE contract_id = NEW.id AND kind = 'return' AND signed_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Signez l''état des lieux de retour avant de clore' USING ERRCODE = 'P0409'; END IF;
    END IF;
    -- recalcul seulement à la création ou si un élément de la réservation change (pas lors d'un simple relevé de km)
    IF NEW.status = 'booked' AND (TG_OP = 'INSERT' OR NEW.vehicle_id <> OLD.vehicle_id OR NEW.starts_at <> OLD.starts_at OR NEW.ends_at <> OLD.ends_at
        OR NEW.formula <> OLD.formula OR NEW.extras IS DISTINCT FROM OLD.extras OR NEW.pickup_location_id IS DISTINCT FROM OLD.pickup_location_id
        OR NEW.license_expires_on <> OLD.license_expires_on OR NEW.license_category <> OLD.license_category OR NEW.license_issued_on <> OLD.license_issued_on
        OR NEW.driver_birthdate <> OLD.driver_birthdate) THEN
        -- contrôles du permis (bloquants), selon les règles du véhicule saisies par l'agence
        IF NEW.license_expires_on < (NEW.ends_at AT TIME ZONE 'Europe/Rome')::date THEN RAISE EXCEPTION 'Permis expiré avant la fin de la location' USING ERRCODE = 'P0409'; END IF;
        IF NEW.license_category <> v.license_category AND NOT (v.license_category = 'B' AND NEW.license_category IN ('BE', 'C1', 'C', 'D1', 'D')) THEN
            RAISE EXCEPTION 'Catégorie de permis insuffisante (% requis)', v.license_category USING ERRCODE = 'P0409'; END IF;
        drv_age := extract(year FROM age((NEW.starts_at AT TIME ZONE 'Europe/Rome')::date, NEW.driver_birthdate));
        IF v.min_driver_age IS NOT NULL AND drv_age < v.min_driver_age THEN RAISE EXCEPTION 'Conducteur trop jeune (% ans minimum)', v.min_driver_age USING ERRCODE = 'P0409'; END IF;
        yrs := extract(year FROM age((NEW.starts_at AT TIME ZONE 'Europe/Rome')::date, NEW.license_issued_on));
        IF v.min_license_years IS NOT NULL AND yrs < v.min_license_years THEN RAISE EXCEPTION 'Permis trop récent (% ans minimum)', v.min_license_years USING ERRCODE = 'P0409'; END IF;
        IF NOT v.is_active THEN RAISE EXCEPTION 'Véhicule inactif' USING ERRCODE = 'P0409'; END IF;
        -- prix figés à partir de la formule du véhicule
        NEW.days := ceil(extract(epoch FROM NEW.ends_at - NEW.starts_at) / 86400.0)::int;
        IF NEW.formula = 'flat' THEN
            IF v.daily_price_cents IS NULL THEN RAISE EXCEPTION 'Formule forfait non tarifée pour ce véhicule' USING ERRCODE = 'P0409'; END IF;
            NEW.daily_price_cents := v.daily_price_cents; NEW.included_km_per_day := v.included_km_per_day; NEW.extra_km_cents := v.extra_km_cents; NEW.per_km_cents := NULL;
        ELSE
            IF v.km_daily_price_cents IS NULL OR v.per_km_cents IS NULL THEN RAISE EXCEPTION 'Formule kilométrage non tarifée pour ce véhicule' USING ERRCODE = 'P0409'; END IF;
            NEW.daily_price_cents := v.km_daily_price_cents; NEW.per_km_cents := v.per_km_cents; NEW.included_km_per_day := NULL; NEW.extra_km_cents := NULL;
        END IF;
        FOR e IN SELECT * FROM jsonb_array_elements(coalesce(NEW.extras, '[]')) LOOP
            SELECT * INTO x FROM rental_extras WHERE id = (e->>'id')::int AND is_active;
            IF x.id IS NULL THEN RAISE EXCEPTION 'Option inconnue' USING ERRCODE = 'P0409'; END IF;
            q := greatest(1, coalesce((e->>'qty')::int, 1));
            ex := ex || jsonb_build_object('id', x.id, 'name', x.name, 'per', x.per, 'qty', q, 'price_cents', x.price_cents,
                       'total_cents', x.price_cents * q * CASE WHEN x.per = 'day' THEN NEW.days ELSE 1 END);
            ext := ext + x.price_cents * q * CASE WHEN x.per = 'day' THEN NEW.days ELSE 1 END;
        END LOOP;
        NEW.extras := ex;
        -- remise ailleurs que la position actuelle : frais au km (distance saisie par l'agence) et délai minimal
        IF NEW.pickup_location_id IS NOT NULL AND coalesce(v.last_location_id, v.home_location_id) IS NOT NULL AND NEW.pickup_location_id <> coalesce(v.last_location_id, v.home_location_id) THEN
            SELECT d.km INTO km FROM rental_location_distances d WHERE d.from_id = coalesce(v.last_location_id, v.home_location_id) AND d.to_id = NEW.pickup_location_id;
            IF km IS NULL OR v.relocation_per_km_cents IS NULL THEN RAISE EXCEPTION 'Distance ou tarif de déplacement non saisi pour ce lieu de remise' USING ERRCODE = 'P0409'; END IF;
            SELECT value::int INTO reposition FROM private.settings WHERE key = 'rental_reposition_hours';
            IF NEW.starts_at < now() + make_interval(hours => coalesce(reposition, 0)) THEN
                RAISE EXCEPTION 'Remise dans un autre lieu : prévoir au moins % h', reposition USING ERRCODE = 'P0409'; END IF;
            relo := km * v.relocation_per_km_cents;
        END IF;
        NEW.relocation_cents := relo;
        NEW.base_total_cents := NEW.days * NEW.daily_price_cents + ext + relo;
        NEW.deposit_cents := coalesce(NEW.deposit_cents, v.deposit_cents);
        NEW.total_cents := NEW.base_total_cents;
    END IF;
    -- au retour : km facturés selon la formule réservée ; total final = base + km + carburant + dégâts (frais saisis par l'agent)
    IF NEW.km_end IS NOT NULL AND NEW.km_start IS NOT NULL THEN
        IF NEW.km_end < NEW.km_start THEN RAISE EXCEPTION 'Kilométrage de retour inférieur au départ' USING ERRCODE = 'P0409'; END IF;
        km := NEW.km_end - NEW.km_start;
        NEW.km_fee_cents := CASE WHEN NEW.formula = 'km' THEN km * NEW.per_km_cents
                                 ELSE greatest(0, km - coalesce(NEW.included_km_per_day, 0) * NEW.days) * coalesce(NEW.extra_km_cents, 0) END;
    END IF;
    IF NEW.status <> 'booked' THEN NEW.total_cents := NEW.base_total_cents + NEW.km_fee_cents + NEW.fuel_fee_cents + NEW.damage_fee_cents; END IF;
    IF TG_OP = 'INSERT' THEN
        INSERT INTO private.rental_counters (year, last) VALUES (extract(year FROM now() AT TIME ZONE 'Europe/Rome')::int, 0) ON CONFLICT (year) DO NOTHING;
        UPDATE private.rental_counters SET last = last + 1 WHERE year = extract(year FROM now() AT TIME ZONE 'Europe/Rome')::int RETURNING last INTO q;
        NEW.reference := 'L' || extract(year FROM now() AT TIME ZONE 'Europe/Rome')::int || '-' || lpad(q::text, 5, '0');
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.rental_before_write() FROM public, anon, authenticated;
CREATE TRIGGER rental_before_write BEFORE INSERT OR UPDATE ON rental_contracts FOR EACH ROW EXECUTE FUNCTION private.rental_before_write();

-- ---------- États des lieux, photos, dégâts ----------
CREATE TABLE inspections (
    id serial PRIMARY KEY,
    contract_id integer NOT NULL REFERENCES rental_contracts(id),
    kind text NOT NULL CHECK (kind IN ('departure', 'return')),
    km integer CHECK (km IS NULL OR km >= 0),
    fuel_eighths smallint CHECK (fuel_eighths IS NULL OR fuel_eighths BETWEEN 0 AND 8),
    notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
    signature_path text,
    signed_by_name text CHECK (signed_by_name IS NULL OR char_length(signed_by_name) <= 200),
    signed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (contract_id, kind)
);
CREATE TABLE inspection_photos (
    id serial PRIMARY KEY,
    inspection_id integer NOT NULL REFERENCES inspections(id),
    side text NOT NULL CHECK (side IN ('front', 'back', 'left', 'right', 'interior', 'dashboard', 'zone')),
    zone text,
    path text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inspection_damages (
    id serial PRIMARY KEY,
    inspection_id integer NOT NULL REFERENCES inspections(id),
    zone text NOT NULL CHECK (zone ~ '^[a-z_]{2,40}$'),
    type text NOT NULL CHECK (type IN ('scratch', 'dent', 'chip', 'crack', 'broken', 'stain', 'burn', 'tear', 'missing', 'to_replace')),
    note text CHECK (note IS NULL OR char_length(note) <= 500),
    photo_path text,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Figé après signature (état des lieux, photos, dégâts) ; signature : photos des 4 faces + intérieur + tableau de bord, km et carburant obligatoires
CREATE FUNCTION private.inspection_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ins inspections; c rental_contracts; missing text;
BEGIN
    IF TG_TABLE_NAME = 'inspections' THEN
        IF OLD.signed_at IS NOT NULL THEN RAISE EXCEPTION 'État des lieux signé : il ne se modifie plus' USING ERRCODE = 'P0409'; END IF;
        IF TG_OP = 'UPDATE' AND NEW.signed_at IS NOT NULL THEN
            SELECT string_agg(s, ', ') INTO missing FROM unnest(ARRAY['front', 'back', 'left', 'right', 'interior', 'dashboard']) s
             WHERE NOT EXISTS (SELECT 1 FROM inspection_photos p WHERE p.inspection_id = NEW.id AND p.side = s);
            IF missing IS NOT NULL THEN RAISE EXCEPTION 'Photos obligatoires manquantes : %', missing USING ERRCODE = 'P0409'; END IF;
            IF NEW.km IS NULL OR NEW.fuel_eighths IS NULL OR NEW.signature_path IS NULL OR btrim(coalesce(NEW.signed_by_name, '')) = '' THEN
                RAISE EXCEPTION 'Kilométrage, carburant, nom et signature obligatoires' USING ERRCODE = 'P0409'; END IF;
            SELECT * INTO c FROM rental_contracts WHERE id = NEW.contract_id;
            INSERT INTO vehicle_odometer (vehicle_id, km, source) VALUES (c.vehicle_id, NEW.km, NEW.kind);   -- refusé si le compteur recule
            IF NEW.kind = 'departure' THEN UPDATE rental_contracts SET km_start = NEW.km, fuel_start = NEW.fuel_eighths WHERE id = c.id;
            ELSE UPDATE rental_contracts SET km_end = NEW.km, fuel_end = NEW.fuel_eighths WHERE id = c.id;
                 UPDATE vehicles SET last_location_id = coalesce(c.return_location_id, last_location_id) WHERE id = c.vehicle_id; END IF;
        END IF;
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    SELECT * INTO ins FROM inspections WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.inspection_id ELSE NEW.inspection_id END;
    IF ins.signed_at IS NOT NULL THEN RAISE EXCEPTION 'État des lieux signé : il ne se modifie plus' USING ERRCODE = 'P0409'; END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION private.inspection_guard() FROM public, anon, authenticated;
CREATE TRIGGER inspection_guard BEFORE UPDATE OR DELETE ON inspections FOR EACH ROW EXECUTE FUNCTION private.inspection_guard();
CREATE TRIGGER inspection_photo_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_photos FOR EACH ROW EXECUTE FUNCTION private.inspection_guard();
CREATE TRIGGER inspection_damage_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_damages FOR EACH ROW EXECUTE FUNCTION private.inspection_guard();

-- ---------- Droits : admin + conseiller ; journal d'audit ----------
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['rental_locations', 'rental_location_distances', 'rental_extras', 'vehicles', 'vehicle_documents', 'vehicle_maintenance', 'vehicle_odometer',
                           'rental_contracts', 'inspections', 'inspection_photos', 'inspection_damages'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('CREATE POLICY team_all_%s ON %I FOR ALL TO authenticated USING (private.current_staff_role() IN (''admin'', ''conseiller'')) WITH CHECK (private.current_staff_role() IN (''admin'', ''conseiller''))', t, t);
    IF t <> 'rental_location_distances' THEN
      EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION write_audit()', t, t);
    END IF;
  END LOOP;
END $$;
GRANT USAGE ON SEQUENCE rental_locations_id_seq, rental_extras_id_seq, vehicles_id_seq, vehicle_documents_id_seq, vehicle_maintenance_id_seq, vehicle_odometer_id_seq,
  rental_contracts_id_seq, inspections_id_seq, inspection_photos_id_seq, inspection_damages_id_seq TO authenticated;

-- ---------- Stockage des photos (Supabase Storage, compartiment privé) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('flotte', 'flotte', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])   -- 2 Mo max, images seulement (pas de SVG)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY flotte_team_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'flotte' AND private.current_staff_role() IN ('admin', 'conseiller'));
CREATE POLICY flotte_team_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flotte' AND private.current_staff_role() IN ('admin', 'conseiller'));
