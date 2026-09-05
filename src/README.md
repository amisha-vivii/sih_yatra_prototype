# YatraShield

**AI-Powered Tourism Trust & Risk Intelligence Platform**

YatraShield analyses tourism service queries, quoted prices, reviews, complaints, incidents and
location data so travellers can make safer decisions before they pay — and so tourism businesses and
authorities can see where service quality is breaking down.

It is not a booking site or an itinerary planner. Every screen serves one of: tourism trust, risk
detection, service quality, traveller safety, or tourism-industry improvement.

---

## 1. Requirements

| Component | Version |
| --- | --- |
| Node.js | 18+ |
| npm | 9+ |
| Python (API deployment) | 3.11+ |
| PostgreSQL | 15+ with PostGIS 3.3+ |

## 2. Installation

```bash
git clone <your-repo-url> yatrashield
cd yatrashield
npm install
```

## 3. Environment setup

```bash
cp .env.example .env
```

Fill in:

| Variable | Purpose |
| --- | --- |
| `VITE_MAP_TILE_URL` / `VITE_MAP_API_KEY` | Raster tile provider (Mapbox or Google). Omit to use key-free OpenStreetMap tiles. |
| `VITE_SECRET_KEY` | HS256 signing secret for session tokens. |
| `DATABASE_URL` | PostgreSQL + PostGIS connection string. |
| `SECRET_KEY` | Signing secret for the API deployment. |
| `MODEL_NAME` | Sentence embedding model for the Python pipeline. |

No key is ever hardcoded, and no secret is committed.

## 4. Database setup

```bash
createdb yatrashield
psql -d yatrashield -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -d yatrashield -f database/schema.sql
```

`database/schema.sql` defines `roles`, `users`, `service_locations`, `tourism_services`,
`price_benchmarks`, `reviews`, `complaints`, `incident_reports`, `service_reports`,
`risk_assessments`, `trust_scores`, `saved_services`, `audit_logs` and `risk_config`, with
`GEOGRAPHY(POINT, 4326)` columns and GIST indexes for location queries.

## 5. Seed data

The reference dataset lives in `data/seed.ts` and is loaded on first run:

- 8 cities — Jaipur, Agra, Goa, Varanasi, Delhi, Udaipur, Manali, Mumbai (real coordinates)
- 26 services across hotels, travel agencies, tour operators, guides, transport and activities
- 48 price benchmarks (city × service type, with p90)
- 39 reviews, 28 complaints, 10 incident records, 10 reports already in the queue
- A deliberate mix of low, medium and high risk profiles

All business names are fictional (`Royal Heritage Stay`, `Pink City Tours`, `Heritage Trails India`,
`BlueLake Travels`, …) and all reviews, complaints and incidents are synthetic. No real operator is
described or labelled.

## 6. Running the frontend

```bash
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## 7. Running the backend

This repository ships a complete, working service layer in TypeScript (`server/`) so the whole
product runs from a single command with no external services. It is structured as a real API — route
table, bearer-token authentication, role authorization, request validation, HTTP status codes — so
moving to FastAPI is a transport swap, not a rewrite:

```
server/api.ts   ->  backend/app/api/routers/*.py   (same routes, same status codes)
server/db.ts    ->  backend/app/db/models.py       (same tables, same indexes)
lib/crypto.ts   ->  passlib pbkdf2_sha256 + python-jose HS256
ml/embeddings.ts->  sentence-transformers (MODEL_NAME)
ml/isolationForest.ts -> sklearn.ensemble.IsolationForest
api/client.ts   ->  point at VITE_API_BASE_URL and the UI is unchanged
```

```bash
# FastAPI deployment
uvicorn app.main:app --reload --port 8000     # OpenAPI docs at /docs and /redoc
```

## 8. Sample accounts

| Role | Email | Password |
| --- | --- | --- |
| Traveller | `tourist@yatrashield.demo` | `Tourist@123` |
| Authority | `admin@yatrashield.demo` | `Admin@123` |

Passwords are stored only as salted, 600-iteration SHA-256 digests. The role comes from the account
record — the tab on the sign-in screen only pre-fills the form, and the role cannot be changed after
sign-in. Self-service registration always creates a traveller account.

## 9. Deployment

```
React (Vercel / Netlify / S3+CloudFront)
        │  HTTPS
FastAPI (Render / Fly.io / ECS, behind uvicorn+gunicorn)
        │
PostgreSQL + PostGIS (managed instance)
        │
External: map tile provider · embedding model · open tourism data
```

- Frontend: `npm run build`, serve `dist/` as a static SPA with a catch-all rewrite to `index.html`.
- Backend: containerise with the model cached at image build time; set `CORS_ORIGINS` to the
  frontend origin.
- Database: enable PostGIS, apply `database/schema.sql`, run the seeder once.
- Secrets: injected as environment variables only.

## 10. API documentation

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | public | Issue a signed session token |
| POST | `/api/auth/register` | public | Create a traveller account |
| POST | `/api/auth/logout` | any session | Revoke the current token |
| GET | `/api/auth/me` | any session | Current account |
| GET | `/api/services` | any session | Registry search (`q`, `city`, `type`) |
| GET | `/api/services/{id}` | any session | Service detail with reviews, complaints, incidents |
| POST | `/api/risk/analyze` | traveller | Run the full pipeline, persist the assessment |
| GET | `/api/risk/history` | any session | Assessments for this account |
| GET | `/api/risk/{id}` | owner or authority | One assessment with contributions |
| GET | `/api/map/services` | any session | Scored markers (`type`, `level`, `near`, `radius_km`) |
| GET | `/api/map/hotspots` | any session | City-level aggregated risk |
| GET | `/api/map/nearby` | any session | Radius query around `lat`/`lng` |
| POST | `/api/reports` | traveller | File a report |
| GET | `/api/reports` | any session | This account's reports |
| GET | `/api/saved` · POST · DELETE | traveller | Saved services |
| GET | `/api/admin/reports` | authority | Full queue (`status`, `category`, `city`, `q`) |
| PATCH | `/api/admin/reports/{id}` | authority | Update status / authority note |
| GET | `/api/admin/services` · POST · PATCH · DELETE | authority | Registry management |
| GET | `/api/admin/analytics` | authority | Trends, categories, clusters |
| GET | `/api/admin/hotspots` | authority | Hotspot list |
| GET | `/api/admin/stats` | authority | Overview counters |
| GET | `/api/admin/ai` | authority | Model state, weights, recent assessments |
| PATCH | `/api/admin/config` | authority | Risk level thresholds |
| GET | `/api/admin/audit` | authority | Audit log |
| GET | `/api/meta/config` | public | Cities, service types, categories, model info |

Errors return `{ "message": string, "fields"?: object }` with `401`, `403`, `404`, `409`, `422` or
`500`. Traces are never returned to the client.

## 11. AI / ML pipeline

```
USER INPUT → DATA COLLECTION → PREPROCESSING → FEATURE EXTRACTION
   → DATA STORAGE / RETRIEVAL → AI ANALYSIS → TRUST + RISK ENGINE
   → EXPLAINABLE RESULT → DASHBOARD
```

**Preprocessing** (`ml/pipeline.ts`) — text cleaning and truncation, price normalisation from free
text, city normalisation and geo resolution, missing-value handling, noise stripping.

**Feature extraction** — text: 256-d sentence embeddings. Price: quoted, benchmark, ratio, deviation.
Location: latitude, longitude, `location_risk_index`. Time: incident dates with recency decay, peak
season flag. Service: type, registration, tenure, complaint and incident frequency.

**Sentence embeddings** (`ml/embeddings.ts`) — normalisation and domain synonym collapsing, then
unigrams + bigrams + character 4-grams hashed into a 256-dimensional signed space, IDF-weighted over
the live corpus and L2-normalised. Cosine similarity drives complaint matching, recurring-complaint
detection, near-duplicate review detection, and greedy semantic clustering for the authority view.
In the Python deployment this is `sentence-transformers/all-MiniLM-L6-v2` behind the same interface.

**Isolation Forest** (`ml/isolationForest.ts`) — the Liu/Ting/Zhou algorithm implemented in full:
random sub-sampling, random split features, path-length averaging, `2^(-E[h(x)]/c(n))` scoring. 120
estimators, sample size 128, deterministic seed. Trained on the observed quote distribution per city
and service type plus the actual amounts in filed reports. Output is worded as a *potential price
anomaly*, never as an accusation.

**Risk engine** — weighted signals, each with its own contribution and detail string:

| Signal | Max points | Source |
| --- | --- | --- |
| Price anomaly | 26 | model |
| Complaint similarity | 22 | model |
| Recent complaint frequency | 18 | rule |
| Incident signal | 14 | rule |
| Review similarity pattern | 12 | model |
| Location & season context | 8 | rule |
| Registration & tenure | 8 | rule |

Bands: 0–30 LOW, 31–60 MEDIUM, 61–100 HIGH — configurable at `PATCH /api/admin/config`.

**YatraTrust score** — a separate, longer-run measure: price alignment, lifetime complaint rate,
feedback consistency, review-pattern integrity, incident history, registration and tenure. Labelled
TRUSTED / MIXED SIGNALS / LOW TRUST.

**What is what:** model-based → price anomaly, complaint similarity, review pattern, clustering.
Rule-based → frequency decay, incident severity decay, location/season context, tenure, and the
weighted composition. Reference data → everything in `data/seed.ts`. Scores are advisory signals
composed from that dataset; they are not a statistically validated fraud classifier.

## 12. Authentication & role-based access

1. `POST /api/auth/login` verifies the password against a salted, iterated digest in constant time.
2. On success it returns an HS256-signed token carrying `sub`, `role`, `email`, `jti`, `exp` (8h).
3. Every request re-verifies the signature, expiry and revocation list, then resolves the role from
   the **database record** — never from anything the client sends.
4. `requireRole(ctx, 'admin')` guards every `/api/admin/*` handler and returns a real `403`.
5. `POST /api/auth/logout` adds the `jti` to the revocation list and the client clears its token.
6. The UI adds `ProtectedRoute` and `RoleProtectedRoute`; a traveller opening `/admin` is redirected
   to their dashboard with a notice. The Profile screen has a button that calls an authority
   endpoint directly so the `403` can be demonstrated.

## 13. Implemented features

**Traveller** — landing page; sign in / register / sign out; dashboard; service check across six
service types with registry auto-complete; full pipeline analysis; result screen with two scores,
signed contributions, model-vs-rule labelling, similar-complaint retrieval and trust signals; safer
alternatives via radius search; interactive map with city / type / level filters and hotspot rings;
check history; saved services; report submission with categories, amount, date and evidence;
report tracking with authority notes; profile with an authorization probe.

**Authority** — separate console; overview counters; hotspot map; complaint volume chart; report
queue with search, status and category filters, case detail, status transitions and notes; analytics
(complaints over time, risk distribution, price anomaly trend, complaint categories, business
insights by category, semantic clusters, hotspots); registry create / edit / delete with immediate
re-scoring; model intelligence with weights, configurable thresholds and recent assessments; audit
log.

**Platform** — layered architecture; typed records; validation on every write; friendly error states
everywhere; loading, empty, success and error states; responsive from mobile to desktop; keyboard
focus styles, semantic landmarks and ARIA labelling.

## 14. Known limitations

- The bundled service layer runs in the browser with a persisted store, so data is per-browser until
  the FastAPI + PostgreSQL deployment is pointed at via `VITE_API_BASE_URL`.
- Embeddings use a hashing encoder rather than a transformer checkpoint in this bundle; the Python
  deployment substitutes `all-MiniLM-L6-v2`. Rankings are similar in character but not identical.
- Radius queries use haversine distance rather than a live PostGIS index in the bundled layer.
- Benchmarks are curated per city and service type, not scraped live, and there is no seasonal
  pricing curve beyond a peak-season flag.
- Evidence uploads record the file name only; no file storage is configured.
- Scores are advisory and unvalidated against ground-truth fraud labels.
- The map falls back to open tiles when no provider key is configured.
