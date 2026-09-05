-- ===========================================================================
-- YatraShield — PostgreSQL + PostGIS schema
-- Mirrors the record shapes in types/index.ts and the store in server/db.ts.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------------
-- identity & access
-- --------------------------------------------------------------------------
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE CHECK (name IN ('admin', 'tourist')),
  description TEXT NOT NULL
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         CITEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  password_hash TEXT NOT NULL,          -- pbkdf2_sha256, never plaintext
  password_salt TEXT NOT NULL,
  home_city     TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx ON users(role_id);

CREATE TABLE revoked_tokens (
  jti        TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- geography & services
-- --------------------------------------------------------------------------
CREATE TABLE service_locations (
  id                  SERIAL PRIMARY KEY,
  city                TEXT NOT NULL,
  state               TEXT NOT NULL,
  geom                GEOGRAPHY(POINT, 4326) NOT NULL,
  location_risk_index NUMERIC(3,2) NOT NULL DEFAULT 0.30
                        CHECK (location_risk_index BETWEEN 0 AND 1),
  peak_months         SMALLINT[] NOT NULL DEFAULT '{}',
  UNIQUE (city, state)
);
CREATE INDEX service_locations_geom_idx ON service_locations USING GIST (geom);

CREATE TABLE tourism_services (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN (
                 'Hotel','Travel Agency','Tour Operator','Guide',
                 'Taxi / Local Transport','Activity / Local Service')),
  location_id  INTEGER NOT NULL REFERENCES service_locations(id) ON DELETE RESTRICT,
  geom         GEOGRAPHY(POINT, 4326) NOT NULL,
  address      TEXT NOT NULL,
  registered   BOOLEAN NOT NULL DEFAULT false,
  years_active SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tourism_services_geom_idx ON tourism_services USING GIST (geom);
CREATE INDEX tourism_services_type_idx ON tourism_services(service_type);
CREATE INDEX tourism_services_location_idx ON tourism_services(location_id);

CREATE TABLE price_benchmarks (
  id              SERIAL PRIMARY KEY,
  location_id     INTEGER NOT NULL REFERENCES service_locations(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL,
  benchmark_price NUMERIC(12,2) NOT NULL,
  p90_price       NUMERIC(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  unit            TEXT NOT NULL,
  UNIQUE (location_id, service_type)
);

-- --------------------------------------------------------------------------
-- signals
-- --------------------------------------------------------------------------
CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  service_id    INTEGER NOT NULL REFERENCES tourism_services(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT NOT NULL,
  author_handle TEXT,
  embedding     REAL[],                 -- pgvector `vector(384)` in production
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_service_idx ON reviews(service_id, created_at DESC);

CREATE TABLE complaints (
  id         SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES tourism_services(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  body       TEXT NOT NULL,
  embedding  REAL[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaints_service_idx ON complaints(service_id, created_at DESC);
CREATE INDEX complaints_category_idx ON complaints(category);

CREATE TABLE incident_reports (
  id          SERIAL PRIMARY KEY,
  service_id  INTEGER REFERENCES tourism_services(id) ON DELETE SET NULL,
  location_id INTEGER NOT NULL REFERENCES service_locations(id) ON DELETE CASCADE,
  severity    SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 3),
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX incident_reports_location_idx ON incident_reports(location_id, created_at DESC);

-- --------------------------------------------------------------------------
-- traveller submissions & scoring output
-- --------------------------------------------------------------------------
CREATE TABLE service_reports (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id    INTEGER REFERENCES tourism_services(id) ON DELETE SET NULL,
  service_name  TEXT NOT NULL,
  location_id   INTEGER REFERENCES service_locations(id) ON DELETE SET NULL,
  city          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
                  'Overcharging','Fake/Misleading Review','Poor Service',
                  'Suspicious Service','Hidden Charges','Other')),
  description   TEXT NOT NULL,
  paid_price    NUMERIC(12,2),
  incident_date DATE NOT NULL,
  evidence_name TEXT,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
                  'Pending','Under Review','Resolved','Rejected')),
  admin_note    TEXT,
  cluster_label TEXT,
  embedding     REAL[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_reports_status_idx ON service_reports(status, created_at DESC);
CREATE INDEX service_reports_user_idx ON service_reports(user_id, created_at DESC);
CREATE INDEX service_reports_service_idx ON service_reports(service_id);

CREATE TABLE risk_assessments (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id          INTEGER REFERENCES tourism_services(id) ON DELETE SET NULL,
  service_name        TEXT NOT NULL,
  service_type        TEXT NOT NULL,
  city                TEXT NOT NULL,
  geom                GEOGRAPHY(POINT, 4326),
  quoted_price        NUMERIC(12,2) NOT NULL,
  benchmark_price     NUMERIC(12,2) NOT NULL,
  price_deviation_pct NUMERIC(6,2) NOT NULL,
  risk_score          SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level          TEXT NOT NULL,
  anomaly_score       NUMERIC(5,3) NOT NULL,
  complaint_similarity NUMERIC(5,3) NOT NULL,
  review_similarity   NUMERIC(5,3) NOT NULL,
  contributions       JSONB NOT NULL,   -- explainability payload
  features            JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX risk_assessments_user_idx ON risk_assessments(user_id, created_at DESC);

CREATE TABLE trust_scores (
  id            BIGSERIAL PRIMARY KEY,
  service_id    INTEGER NOT NULL REFERENCES tourism_services(id) ON DELETE CASCADE,
  trust_score   SMALLINT NOT NULL CHECK (trust_score BETWEEN 0 AND 100),
  trust_label   TEXT NOT NULL,
  signals       JSONB NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trust_scores_service_idx ON trust_scores(service_id, computed_at DESC);

CREATE TABLE saved_services (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES tourism_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);

CREATE TABLE audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  INTEGER,
  detail     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);

CREATE TABLE risk_config (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  low_max    SMALLINT NOT NULL DEFAULT 30,
  medium_max SMALLINT NOT NULL DEFAULT 60,
  weights    JSONB NOT NULL
);

-- --------------------------------------------------------------------------
-- example location-aware queries used by the API
-- --------------------------------------------------------------------------
-- services within 25 km of a point (GET /api/map/nearby)
--   SELECT s.*, ST_Distance(s.geom, :point) / 1000 AS distance_km
--   FROM tourism_services s
--   WHERE ST_DWithin(s.geom, :point, 25000)
--   ORDER BY distance_km;
--
-- risk hotspots per city (GET /api/map/hotspots)
--   SELECT l.city, l.geom, AVG(t.risk_score)::int AS avg_risk, COUNT(*) AS services
--   FROM tourism_services s
--   JOIN service_locations l ON l.id = s.location_id
--   JOIN LATERAL (
--     SELECT risk_score FROM risk_assessments r
--     WHERE r.service_id = s.id ORDER BY r.created_at DESC LIMIT 1
--   ) t ON true
--   GROUP BY l.city, l.geom
--   ORDER BY avg_risk DESC;
