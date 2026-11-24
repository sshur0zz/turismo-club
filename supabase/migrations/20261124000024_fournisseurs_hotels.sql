-- Turismo Club — 24 : lot 2 « Fournisseurs et hôtels » (matrice des écarts, lignes 10, 11, 12)
-- Montants en centimes (integer), taux en points de base (1 000 = 10,00 %) : jamais de flottant.
-- Aucun tarif, taux de TVA ni disponibilité n'est inventé : tout est saisi par l'agence ; sans TVA saisie, pas de prix.

-- ---------- Fournisseurs ----------
CREATE TABLE suppliers (
    id serial PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('hotel', 'transport', 'car_rental', 'receptive', 'airline', 'venue', 'guide', 'restaurant', 'other')),
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    contact_name text CHECK (contact_name IS NULL OR char_length(contact_name) <= 200),
    email citext CHECK (email IS NULL OR char_length(email::text) <= 200),
    phone text CHECK (phone IS NULL OR char_length(phone) <= 50),
    phone_e164 text,
    address text CHECK (address IS NULL OR char_length(address) <= 300),
    city text CHECK (city IS NULL OR char_length(city) <= 100),
    country text CHECK (country IS NULL OR char_length(country) <= 2),
    cancellation_policy text CHECK (cancellation_policy IS NULL OR char_length(cancellation_policy) <= 2000),
    notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX suppliers_unique_name ON suppliers (kind, lower(name));   -- doublon refusé
CREATE FUNCTION private.supplier_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.phone_e164 := private.phone_e164(NEW.phone); IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.supplier_before_write() FROM public, anon, authenticated;
CREATE TRIGGER supplier_before_write BEFORE INSERT OR UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION private.supplier_before_write();

-- ---------- Hôtels ----------
CREATE TABLE hotels (
    id serial PRIMARY KEY,
    supplier_id integer REFERENCES suppliers(id),
    destination_id integer NOT NULL REFERENCES destinations(id),
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    kind text NOT NULL DEFAULT 'hotel' CHECK (kind IN ('hotel', 'bnb', 'apartment', 'resort', 'guesthouse')),
    stars smallint CHECK (stars IS NULL OR stars BETWEEN 1 AND 5),
    address text CHECK (address IS NULL OR char_length(address) <= 300),
    lat numeric(9,6) CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
    lng numeric(9,6) CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
    amenities text[] NOT NULL DEFAULT '{}' CHECK (cardinality(amenities) <= 60),          -- codes de la bibliothèque d'icônes
    boards text[] NOT NULL DEFAULT '{}' CHECK (boards <@ ARRAY['RO', 'BB', 'HB', 'FB', 'AI']), -- pensions proposées
    check_in text CHECK (check_in IS NULL OR check_in ~ '^[0-2][0-9]:[0-5][0-9]$'),
    check_out text CHECK (check_out IS NULL OR check_out ~ '^[0-2][0-9]:[0-5][0-9]$'),
    baby_max_age smallint NOT NULL DEFAULT 1 CHECK (baby_max_age BETWEEN 0 AND 5),          -- âge maximal « bébé » (gratuit)
    child_max_age smallint NOT NULL DEFAULT 11 CHECK (child_max_age BETWEEN 1 AND 17),      -- au-delà : adulte
    description_i18n jsonb NOT NULL DEFAULT '{}',
    photo_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photo_urls) <= 20),
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (child_max_age > baby_max_age)
);
CREATE TABLE hotel_rooms (
    id serial PRIMARY KEY,
    hotel_id integer NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    adults_min smallint NOT NULL DEFAULT 1 CHECK (adults_min >= 1),
    adults_max smallint NOT NULL CHECK (adults_max >= 1),
    children_max smallint NOT NULL DEFAULT 0 CHECK (children_max >= 0),
    occupancy_max smallint NOT NULL CHECK (occupancy_max >= 1),
    baby_cot boolean NOT NULL DEFAULT false,
    amenities text[] NOT NULL DEFAULT '{}' CHECK (cardinality(amenities) <= 40),
    CHECK (adults_max >= adults_min AND occupancy_max >= adults_max)
);
CREATE TABLE hotel_seasons (
    id serial PRIMARY KEY,
    hotel_id integer NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    date_from date NOT NULL,
    date_to date NOT NULL,                                   -- dernière nuit incluse
    min_nights smallint NOT NULL DEFAULT 1 CHECK (min_nights >= 1),
    release_days smallint NOT NULL DEFAULT 0 CHECK (release_days >= 0),
    stop_sale boolean NOT NULL DEFAULT false,
    vat_rate_bp integer NOT NULL CHECK (vat_rate_bp BETWEEN 0 AND 10000),      -- TVA saisie par l'agence (aucune valeur par défaut)
    single_supplement_cents integer NOT NULL DEFAULT 0 CHECK (single_supplement_cents >= 0),   -- par nuit, chambre occupée par 1 adulte
    third_adult_discount_bp integer NOT NULL DEFAULT 0 CHECK (third_adult_discount_bp BETWEEN 0 AND 10000),
    CHECK (date_to >= date_from)
);
CREATE TABLE hotel_child_bands (
    id serial PRIMARY KEY,
    season_id integer NOT NULL REFERENCES hotel_seasons(id) ON DELETE CASCADE,
    age_from smallint NOT NULL CHECK (age_from >= 0),
    age_to smallint NOT NULL,
    discount_bp integer NOT NULL CHECK (discount_bp BETWEEN 0 AND 10000),   -- réduction sur le prix adulte (10 000 = gratuit)
    CHECK (age_to >= age_from)
);
CREATE TABLE hotel_rates (
    id serial PRIMARY KEY,
    season_id integer NOT NULL REFERENCES hotel_seasons(id) ON DELETE CASCADE,
    room_id integer NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
    board text NOT NULL CHECK (board IN ('RO', 'BB', 'HB', 'FB', 'AI')),
    cost_cents integer NOT NULL CHECK (cost_cents >= 0),                     -- coût d'achat HT par adulte et par nuit
    margin_bp integer CHECK (margin_bp IS NULL OR margin_bp BETWEEN 0 AND 100000),
    price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),     -- prix client HT imposé (prioritaire sur la marge)
    UNIQUE (season_id, room_id, board),
    CHECK (margin_bp IS NOT NULL OR price_cents IS NOT NULL)
);
CREATE TABLE hotel_allotments (
    room_id integer NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
    day date NOT NULL,
    quantity smallint NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (room_id, day)
);
CREATE INDEX hotel_seasons_dates ON hotel_seasons (hotel_id, date_from, date_to);

-- Contrôle : les saisons d'un même hôtel ne se chevauchent pas (sinon le prix d'une nuit serait ambigu)
CREATE FUNCTION private.season_no_overlap() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM hotel_seasons s WHERE s.hotel_id = NEW.hotel_id AND s.id <> coalesce(NEW.id, -1)
               AND s.date_from <= NEW.date_to AND NEW.date_from <= s.date_to) THEN
        RAISE EXCEPTION 'Cette saison chevauche une autre saison du même hôtel' USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.season_no_overlap() FROM public, anon, authenticated;
CREATE TRIGGER season_no_overlap BEFORE INSERT OR UPDATE ON hotel_seasons FOR EACH ROW EXECUTE FUNCTION private.season_no_overlap();

-- ---------- Droits : admin + conseiller ; rien pour le public (le public passe par public_hotel_search) ----------
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers', 'hotels', 'hotel_rooms', 'hotel_seasons', 'hotel_child_bands', 'hotel_rates', 'hotel_allotments'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('CREATE POLICY team_all_%s ON %I FOR ALL TO authenticated USING (private.current_staff_role() IN (''admin'', ''conseiller'')) WITH CHECK (private.current_staff_role() IN (''admin'', ''conseiller''))', t, t);
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION write_audit()', t, t);
  END LOOP;
END $$;
-- hotel_allotments n'a pas de colonne id : journal d'audit adapté
DROP TRIGGER audit_hotel_allotments ON hotel_allotments;
GRANT USAGE ON SEQUENCE suppliers_id_seq, hotels_id_seq, hotel_rooms_id_seq, hotel_seasons_id_seq, hotel_child_bands_id_seq, hotel_rates_id_seq TO authenticated;

-- ---------- Calcul du prix d'un séjour ----------
-- Arrondi bancaire (au pair) au centime : 0,5 → pair le plus proche
CREATE FUNCTION private.round_half_even(x numeric) RETURNS bigint
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN abs(x - trunc(x)) = 0.5 THEN (trunc(x) + CASE WHEN trunc(x)::bigint % 2 = 0 THEN 0 ELSE sign(x) END)::bigint
                ELSE round(x)::bigint END
$$;

-- p_child_ages : âges des enfants ET des bébés à la date d'arrivée.
-- Renvoie un JSON : nights, total_cents (TTC), ht_cents, vat_cents, cost_cents, lines[] ; ou error (code lisible).
CREATE FUNCTION private.price_stay(p_room integer, p_board text, p_in date, p_out date, p_adults integer, p_child_ages integer[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    rm hotel_rooms; h hotels; s hotel_seasons; r hotel_rates;
    d date; nights int := p_out - p_in; ages int[] := coalesce(p_child_ages, '{}');
    n_child int := 0; n_baby int := 0; a int; i int;
    adult_price numeric; amt numeric; disc int;
    ht bigint := 0; vat bigint := 0; cost_total bigint := 0; detail jsonb := '[]';
    night_ht bigint; night_vat bigint; night_cost bigint;
BEGIN
    SELECT * INTO rm FROM hotel_rooms WHERE id = p_room;
    IF rm.id IS NULL THEN RETURN jsonb_build_object('error', 'room_not_found'); END IF;
    SELECT * INTO h FROM hotels WHERE id = rm.hotel_id;
    IF nights < 1 THEN RETURN jsonb_build_object('error', 'dates'); END IF;
    IF p_adults IS NULL OR p_adults < 1 THEN RETURN jsonb_build_object('error', 'no_adult'); END IF;   -- jamais d'enfant ni de bébé sans adulte
    IF NOT (p_board = ANY (h.boards)) THEN RETURN jsonb_build_object('error', 'board'); END IF;
    FOREACH a IN ARRAY ages LOOP
        IF a < 0 OR a > 17 THEN RETURN jsonb_build_object('error', 'age'); END IF;
        IF a <= h.baby_max_age THEN n_baby := n_baby + 1; ELSIF a <= h.child_max_age THEN n_child := n_child + 1; END IF;
    END LOOP;
    -- Les « enfants » plus âgés que child_max_age comptent comme adultes
    IF p_adults + (SELECT count(*) FROM unnest(ages) x WHERE x > h.child_max_age) < rm.adults_min
       OR p_adults + (SELECT count(*) FROM unnest(ages) x WHERE x > h.child_max_age) > rm.adults_max
       OR n_child > rm.children_max
       OR p_adults + cardinality(ages) - (CASE WHEN rm.baby_cot THEN n_baby ELSE 0 END) > rm.occupancy_max THEN
        RETURN jsonb_build_object('error', 'occupancy');
    END IF;
    FOR i IN 0 .. nights - 1 LOOP
        d := p_in + i;
        SELECT * INTO s FROM hotel_seasons WHERE hotel_id = h.id AND d BETWEEN date_from AND date_to;
        IF s.id IS NULL THEN RETURN jsonb_build_object('error', 'no_season', 'night', d); END IF;
        IF s.stop_sale THEN RETURN jsonb_build_object('error', 'stop_sale', 'night', d); END IF;
        IF i = 0 AND nights < s.min_nights THEN RETURN jsonb_build_object('error', 'min_nights', 'min', s.min_nights); END IF;
        SELECT * INTO r FROM hotel_rates WHERE season_id = s.id AND room_id = rm.id AND board = p_board;
        IF r.id IS NULL THEN RETURN jsonb_build_object('error', 'no_rate', 'night', d); END IF;
        adult_price := coalesce(r.price_cents::numeric, r.cost_cents * (10000 + r.margin_bp) / 10000.0);
        night_ht := 0; night_cost := 0;
        -- adultes : 1er et 2e au prix plein ; à partir du 3e, réduction de saison ; adulte seul : supplément single
        FOR a IN 1 .. p_adults + (SELECT count(*) FROM unnest(ages) x WHERE x > h.child_max_age)::int LOOP
            amt := CASE WHEN a >= 3 THEN adult_price * (10000 - s.third_adult_discount_bp) / 10000.0 ELSE adult_price END;
            night_ht := night_ht + private.round_half_even(amt);
            night_cost := night_cost + r.cost_cents;
        END LOOP;
        IF p_adults + (SELECT count(*) FROM unnest(ages) x WHERE x > h.child_max_age) = 1 AND n_child = 0 THEN
            night_ht := night_ht + s.single_supplement_cents;
        END IF;
        -- enfants : réduction selon la tranche d'âge de la saison (sans tranche : prix adulte) ; bébés : gratuits
        FOREACH a IN ARRAY ages LOOP
            CONTINUE WHEN a <= h.baby_max_age OR a > h.child_max_age;
            SELECT discount_bp INTO disc FROM hotel_child_bands WHERE season_id = s.id AND a BETWEEN age_from AND age_to ORDER BY age_from LIMIT 1;
            night_ht := night_ht + private.round_half_even(adult_price * (10000 - coalesce(disc, 0)) / 10000.0);
            night_cost := night_cost + r.cost_cents;
            disc := NULL;
        END LOOP;
        night_vat := private.round_half_even(night_ht * s.vat_rate_bp / 10000.0);
        ht := ht + night_ht; vat := vat + night_vat; cost_total := cost_total + night_cost;
        detail := detail || jsonb_build_object('night', d, 'season', s.name, 'ht_cents', night_ht, 'vat_cents', night_vat, 'vat_rate_bp', s.vat_rate_bp);
    END LOOP;
    RETURN jsonb_build_object('nights', nights, 'ht_cents', ht, 'vat_cents', vat, 'total_cents', ht + vat, 'cost_cents', cost_total, 'lines', detail);
END $$;
REVOKE ALL ON FUNCTION private.price_stay(integer, text, date, date, integer, integer[]) FROM public, anon, authenticated;

-- Équipe : calcul complet (coût et marge visibles)
CREATE FUNCTION private.staff_price_stay(p_room integer, p_board text, p_in date, p_out date, p_adults integer, p_child_ages integer[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF private.current_staff_role() NOT IN ('admin', 'conseiller') THEN RAISE EXCEPTION 'introuvable' USING ERRCODE = 'P0002'; END IF;
    RETURN private.price_stay(p_room, p_board, p_in, p_out, p_adults, p_child_ages);
END $$;
REVOKE ALL ON FUNCTION private.staff_price_stay(integer, text, date, date, integer, integer[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.staff_price_stay(integer, text, date, date, integer, integer[]) TO authenticated;
CREATE FUNCTION public.staff_price_stay(p_room integer, p_board text, p_in date, p_out date, p_adults integer, p_child_ages integer[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.staff_price_stay(p_room, p_board, p_in, p_out, p_adults, p_child_ages) $$;
REVOKE ALL ON FUNCTION public.staff_price_stay(integer, text, date, date, integer, integer[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_price_stay(integer, text, date, date, integer, integer[]) TO authenticated;

-- Public : recherche d'hôtels publiés ; ne renvoie QUE le prix client TTC (jamais coût, marge ni TVA détaillée par fournisseur)
CREATE FUNCTION private.public_hotel_search(p_dest text, p_in date, p_out date, p_adults integer, p_child_ages integer[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb := '[]'; h record; rm record; b text; q jsonb; opts jsonb; is_full boolean;
BEGIN
    IF p_in IS NULL OR p_out IS NULL OR p_out <= p_in OR p_out - p_in > 30 OR p_in < current_date THEN RETURN '[]'; END IF;
    IF p_adults IS NULL OR p_adults < 1 OR p_adults > 6 OR cardinality(coalesce(p_child_ages, '{}')) > 4 THEN RETURN '[]'; END IF;
    FOR h IN SELECT ho.*, de.slug AS dest FROM hotels ho JOIN destinations de ON de.id = ho.destination_id
             WHERE ho.is_published AND (p_dest IS NULL OR p_dest = '' OR de.slug = p_dest) ORDER BY ho.stars DESC NULLS LAST, ho.name LIMIT 50 LOOP
        opts := '[]';
        FOR rm IN SELECT * FROM hotel_rooms WHERE hotel_id = h.id ORDER BY id LOOP
            -- allotement saisi à 0 sur une nuit = complet ; sans allotement saisi : « sur demande » (aucune disponibilité inventée)
            is_full := EXISTS (SELECT 1 FROM hotel_allotments al WHERE al.room_id = rm.id AND al.day >= p_in AND al.day < p_out AND al.quantity = 0);
            CONTINUE WHEN is_full;
            FOREACH b IN ARRAY h.boards LOOP
                q := private.price_stay(rm.id, b, p_in, p_out, p_adults, p_child_ages);
                IF q ? 'total_cents' THEN
                    opts := opts || jsonb_build_object('room_id', rm.id, 'room', rm.name, 'board', b, 'total_cents', q->'total_cents', 'nights', q->'nights', 'room_amenities', to_jsonb(rm.amenities));
                END IF;
            END LOOP;
        END LOOP;
        IF jsonb_array_length(opts) > 0 THEN
            res := res || jsonb_build_object('id', h.id, 'name', h.name, 'kind', h.kind, 'stars', h.stars, 'dest', h.dest, 'address', h.address,
                'amenities', to_jsonb(h.amenities), 'description', h.description_i18n, 'photos', to_jsonb(h.photo_urls),
                'check_in', h.check_in, 'check_out', h.check_out, 'options', opts);
        END IF;
    END LOOP;
    RETURN res;
END $$;
REVOKE ALL ON FUNCTION private.public_hotel_search(text, date, date, integer, integer[]) FROM public;
GRANT EXECUTE ON FUNCTION private.public_hotel_search(text, date, date, integer, integer[]) TO anon, authenticated;
CREATE FUNCTION public.public_hotel_search(p_dest text, p_in date, p_out date, p_adults integer, p_child_ages integer[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.public_hotel_search(p_dest, p_in, p_out, p_adults, p_child_ages) $$;
REVOKE ALL ON FUNCTION public.public_hotel_search(text, date, date, integer, integer[]) FROM public;
GRANT EXECUTE ON FUNCTION public.public_hotel_search(text, date, date, integer, integer[]) TO anon, authenticated;
