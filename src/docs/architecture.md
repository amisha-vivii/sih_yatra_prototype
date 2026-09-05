# YatraShield architecture

## Layers

```
pages/            route screens (traveller + authority)
components/       reusable UI, layouts, route guards, map, forms
contexts/         auth session provider
api/              HTTP client: token attachment, typed errors
server/           service layer: route table, auth, authorization, validation
  api.ts          -> FastAPI routers
  db.ts           -> PostgreSQL + PostGIS models, indexes, geo queries
ml/               analysis pipeline
  embeddings.ts   -> sentence-transformers
  isolationForest.ts -> sklearn IsolationForest
  pipeline.ts     -> preprocessing, features, risk + trust engines
lib/crypto.ts     password hashing + signed tokens
data/seed.ts      reference dataset (fictional operators, synthetic signals)
types/            shared record and enum types
database/         PostgreSQL + PostGIS schema
docs/             this document
```

## Request path

```
screen -> api/client.ts -> server/api.ts route table
            token verify -> role check -> validation -> handler
            handler -> server/db.ts (tables, indexes, geo)
                    -> ml/pipeline.ts (features, models, engines)
            <- { status, data }
        <- typed ApiError on non-2xx (message + field errors)
```

## Analysis path

```
POST /api/risk/analyze
  1 collection      registry match, location resolve, benchmark lookup,
                    complaints / reviews / reports / incidents retrieval
  2 preprocessing   text clean, price normalise, city normalise, missing values
  3 features        price ratio & deviation, type, lat/lng, area index,
                    season, registration, tenure, frequency
  4 AI analysis     IsolationForest.score(featureVector)
                    cosine(encode(query), encode(corpus))
                    max pairwise review similarity
  5 risk engine     weighted contributions -> 0-100 -> LOW / MEDIUM / HIGH
  6 trust engine    price alignment, lifetime complaint rate, feedback
                    consistency, review integrity, incidents, registry status
  7 persistence     risk_assessments row with contributions + features JSON
  8 result          explainable payload rendered on the result screen
```

## Authorization boundary

`server/api.ts` resolves the role from the user record on every request.
`requireRole(ctx, 'admin')` wraps every `/api/admin/*` handler and raises a 403.
The React guards (`ProtectedRoute`, `RoleProtectedRoute`) only improve navigation —
removing them would not grant a traveller access to authority data.

## Where each score comes from

| Output | Computed in | Inputs |
| --- | --- | --- |
| Risk score | `ml/pipeline.ts` → risk engine | 7 weighted signals, 3 model-based |
| Risk level | `riskLevelFor` + `risk_config` | configurable thresholds |
| YatraTrust score | `ml/pipeline.ts` → trust engine | long-run service history |
| Anomaly score | `ml/isolationForest.ts` | price/service feature vector |
| Complaint similarity | `ml/embeddings.ts` | cosine over 256-d vectors |
| Clusters | `clusterTexts` | greedy centroid clustering |
| Hotspots | `hotspots()` | per-city aggregation of service profiles |
