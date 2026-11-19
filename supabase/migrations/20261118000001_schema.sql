-- =====================================================================
-- Turismo Club — schéma PostgreSQL (v1)
-- Couvre les maquettes : accueil, catalogue, fiche activité,
-- réservation en ligne et demandes de devis sur-mesure.
--
-- Conventions :
--   * noms de tables en anglais au pluriel, snake_case
--   * prix en CENTIMES (integer) : jamais de float pour de l'argent
--   * dates avec fuseau horaire (timestamptz)
--   * contenu en français pour l'instant (voir README pour FR/EN/IT)
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;   -- e-mails insensibles à la casse

-- ---------------------------------------------------------------------
-- Types énumérés : la base refuse toute valeur hors liste
-- ---------------------------------------------------------------------
CREATE TYPE activity_format  AS ENUM ('small_group', 'private');
CREATE TYPE departure_status AS ENUM ('open', 'full', 'cancelled');
CREATE TYPE booking_status   AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE quote_status     AS ENUM ('new', 'in_progress', 'sent', 'won', 'lost');
CREATE TYPE review_source    AS ENUM ('site', 'google', 'tripadvisor');

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------
CREATE TABLE destinations (
    id          serial PRIMARY KEY,
    slug        text NOT NULL UNIQUE,            -- utilisé dans l'URL : /rome
    name        text NOT NULL,
    is_day_trip boolean NOT NULL DEFAULT false   -- excursion au départ de Rome ?
);

-- Les « envies » de la recherche et des filtres
CREATE TABLE categories (
    id       serial PRIMARY KEY,
    slug     text NOT NULL UNIQUE,
    name     text NOT NULL,
    position smallint NOT NULL DEFAULT 0          -- ordre d'affichage
);

CREATE TABLE guides (
    id         serial PRIMARY KEY,
    first_name text NOT NULL,
    last_name  text,
    languages  text[] NOT NULL DEFAULT '{fr}',   -- ex. {fr,it,en}
    bio        text,
    photo_url  text,
    is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE activities (
    id                 serial PRIMARY KEY,
    slug               text NOT NULL UNIQUE,
    destination_id     int  NOT NULL REFERENCES destinations(id),
    title              text NOT NULL,
    summary            text NOT NULL,             -- 1 phrase pour les cartes
    description        text,
    duration_minutes   int  NOT NULL CHECK (duration_minutes > 0),
    format             activity_format NOT NULL DEFAULT 'small_group',
    max_group_size     int  NOT NULL CHECK (max_group_size > 0),
    price_adult_cents  int  NOT NULL CHECK (price_adult_cents >= 0),
    price_child_cents  int  CHECK (price_child_cents >= 0),   -- NULL = tarif adulte
    child_min_age      smallint,
    highlights         text[] NOT NULL DEFAULT '{}',          -- « Points forts »
    included           text[] NOT NULL DEFAULT '{}',
    not_included       text[] NOT NULL DEFAULT '{}',
    important_info     text,                                   -- « À savoir »
    meeting_point      text NOT NULL,
    meeting_lat        numeric(9,6),
    meeting_lng        numeric(9,6),
    badge              text,                                   -- « Coupe-file », « Best-seller »
    is_published       boolean NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Une activité peut appartenir à plusieurs envies (relation N-N)
CREATE TABLE activity_categories (
    activity_id int NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    category_id int NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, category_id)
);

-- « Le programme » de la fiche activité
CREATE TABLE activity_steps (
    id               serial PRIMARY KEY,
    activity_id      int NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    position         smallint NOT NULL,
    title            text NOT NULL,
    description      text,
    duration_minutes int,
    UNIQUE (activity_id, position)
);

CREATE TABLE activity_photos (
    id          serial PRIMARY KEY,
    activity_id int NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    url         text NOT NULL,
    alt_text    text NOT NULL,                    -- obligatoire : accessibilité
    position    smallint NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- Disponibilités : un « départ » = une activité à une date/heure
-- ---------------------------------------------------------------------
CREATE TABLE departures (
    id          serial PRIMARY KEY,
    activity_id int NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    guide_id    int REFERENCES guides(id),
    starts_at   timestamptz NOT NULL,
    language    text NOT NULL DEFAULT 'fr',
    capacity    int NOT NULL CHECK (capacity > 0),
    status      departure_status NOT NULL DEFAULT 'open',
    UNIQUE (activity_id, starts_at, language)
);

-- ---------------------------------------------------------------------
-- Clients, réservations, paiements
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    id         serial PRIMARY KEY,
    email      citext NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name  text NOT NULL,
    phone      text,
    locale     text NOT NULL DEFAULT 'fr',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
    id           serial PRIMARY KEY,
    reference    text NOT NULL UNIQUE
                 DEFAULT 'TC-' || upper(substr(md5(random()::text), 1, 8)),
    customer_id  int NOT NULL REFERENCES customers(id),
    departure_id int NOT NULL REFERENCES departures(id),
    adults       int NOT NULL CHECK (adults >= 1),
    children     int NOT NULL DEFAULT 0 CHECK (children >= 0),
    total_cents  int NOT NULL CHECK (total_cents >= 0),
    currency     char(3) NOT NULL DEFAULT 'EUR',
    status       booking_status NOT NULL DEFAULT 'pending',
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    cancelled_at timestamptz
);

CREATE TABLE payments (
    id           serial PRIMARY KEY,
    booking_id   int NOT NULL REFERENCES bookings(id),
    provider     text NOT NULL,                    -- 'stripe', 'paypal'
    provider_ref text NOT NULL,                    -- id renvoyé par Stripe…
    amount_cents int NOT NULL,                     -- négatif = remboursement
    status       text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_ref)
);

-- ---------------------------------------------------------------------
-- Avis : uniquement de vrais avis (site après visite, ou importés)
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id           serial PRIMARY KEY,
    activity_id  int REFERENCES activities(id) ON DELETE SET NULL,  -- NULL = avis sur l'agence
    booking_id   int UNIQUE REFERENCES bookings(id),                -- 1 avis max par réservation
    source       review_source NOT NULL DEFAULT 'site',
    author_name  text NOT NULL,
    rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      text,
    visited_on   date,
    is_published boolean NOT NULL DEFAULT false,                    -- modération
    created_at   timestamptz NOT NULL DEFAULT now(),
    -- un avis « site » doit venir d'une vraie réservation
    CHECK (source <> 'site' OR booking_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- Demandes de devis « Séjours sur-mesure »
-- ---------------------------------------------------------------------
CREATE TABLE quote_requests (
    id            serial PRIMARY KEY,
    first_name    text NOT NULL,
    last_name     text,
    email         citext NOT NULL,
    phone         text,
    date_from     date,
    date_to       date,
    travelers     int CHECK (travelers > 0),
    budget_cents  int CHECK (budget_cents >= 0),
    interests     text[] NOT NULL DEFAULT '{}',   -- slugs de categories
    message       text,
    status        quote_status NOT NULL DEFAULT 'new',
    assigned_to   text,                            -- conseiller en charge
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (date_to IS NULL OR date_from IS NULL OR date_to >= date_from)
);

-- ---------------------------------------------------------------------
-- Index : accélèrent les requêtes fréquentes des pages
-- ---------------------------------------------------------------------
CREATE INDEX ON activities (destination_id) WHERE is_published;
CREATE INDEX ON activity_categories (category_id);
CREATE INDEX ON departures (activity_id, starts_at) WHERE status = 'open';
CREATE INDEX ON bookings (departure_id) WHERE status IN ('pending', 'confirmed');
CREATE INDEX ON bookings (customer_id);
CREATE INDEX ON reviews (activity_id) WHERE is_published;
CREATE INDEX ON quote_requests (status, created_at);

-- ---------------------------------------------------------------------
-- updated_at automatique sur activities
-- ---------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Anti-surréservation : refuse une réservation qui dépasse la capacité.
-- FOR UPDATE verrouille le départ : deux clients qui réservent la
-- dernière place en même temps ne peuvent pas passer tous les deux.
-- ---------------------------------------------------------------------
CREATE FUNCTION check_departure_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    cap    int;
    st     departure_status;
    booked int;
BEGIN
    IF NEW.status NOT IN ('pending', 'confirmed') THEN
        RETURN NEW;
    END IF;

    SELECT capacity, status INTO cap, st
    FROM departures WHERE id = NEW.departure_id FOR UPDATE;

    IF st <> 'open' THEN
        RAISE EXCEPTION 'Départ % non réservable (statut : %)', NEW.departure_id, st;
    END IF;

    SELECT coalesce(sum(adults + children), 0) INTO booked
    FROM bookings
    WHERE departure_id = NEW.departure_id
      AND status IN ('pending', 'confirmed')
      AND id IS DISTINCT FROM NEW.id;

    IF booked + NEW.adults + NEW.children > cap THEN
        RAISE EXCEPTION 'Plus assez de places : % restante(s)', cap - booked;
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER bookings_capacity
    BEFORE INSERT OR UPDATE OF adults, children, status, departure_id ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_departure_capacity();

-- ---------------------------------------------------------------------
-- Vues : ce que les pages lisent directement
-- ---------------------------------------------------------------------

-- Cartes du catalogue et de l'accueil : note, nb d'avis, nb de réservations
CREATE VIEW activity_cards AS
SELECT a.id, a.slug, a.title, a.summary, a.duration_minutes, a.format,
       a.price_adult_cents, a.badge,
       d.slug AS destination_slug, d.name AS destination_name,
       round(avg(r.rating), 1)                AS rating_avg,
       count(DISTINCT r.id)                   AS review_count,
       (SELECT count(*) FROM bookings b
          JOIN departures dp ON dp.id = b.departure_id
         WHERE dp.activity_id = a.id AND b.status = 'confirmed') AS bookings_count,
       (SELECT url FROM activity_photos p
         WHERE p.activity_id = a.id ORDER BY position LIMIT 1)   AS cover_url
FROM activities a
JOIN destinations d ON d.id = a.destination_id
LEFT JOIN reviews r ON r.activity_id = a.id AND r.is_published
WHERE a.is_published
GROUP BY a.id, d.id;

-- Créneaux de l'encadré « Réserver » avec places restantes
CREATE VIEW departure_availability AS
SELECT dp.id, dp.activity_id, dp.starts_at, dp.language, dp.capacity,
       dp.capacity - coalesce(sum(b.adults + b.children)
                     FILTER (WHERE b.status IN ('pending', 'confirmed')), 0) AS seats_left
FROM departures dp
LEFT JOIN bookings b ON b.departure_id = dp.id
WHERE dp.status = 'open' AND dp.starts_at > now()
GROUP BY dp.id;

COMMIT;
