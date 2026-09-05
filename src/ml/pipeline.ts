/**
 * YatraShield analysis pipeline
 * -----------------------------
 * USER INPUT -> DATA COLLECTION -> PREPROCESSING -> FEATURE EXTRACTION
 *   -> DATA STORAGE/RETRIEVAL -> AI ANALYSIS -> TRUST + RISK ENGINE
 *   -> EXPLAINABLE RESULT
 *
 * What is model-based:
 *   - price/service anomaly  -> Isolation Forest (ml/isolationForest.ts)
 *   - complaint & review semantics -> sentence embeddings (ml/embeddings.ts)
 * What is rule-based:
 *   - complaint frequency, incident severity decay, location context,
 *     registration/tenure signals, and the weighted score composition.
 * What is reference data: everything under data/seed.ts.
 */

import { cosineSimilarity, clusterTexts, conceptLabel, encode, fitCorpus } from './embeddings';
import { IsolationForest } from './isolationForest';
import {
  benchmarkFor,
  distanceKm,
  getDb,
  locationByCity,
  locationById,
  serviceById,
  servicesWithin } from
'../server/db';
import type {
  RiskLevel,
  ServiceType,
  SignalContribution } from
'../types';
import { SERVICE_TYPES } from '../types';

/* ----------------------------- preprocessing ---------------------------- */

export function cleanText(input: string): string {
  return (input || '').
  replace(/\s+/g, ' ').
  replace(/(.)\1{3,}/g, '$1$1').
  replace(/[<>]/g, '').
  trim().
  slice(0, 1200);
}

export function normalisePrice(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null;
  const numeric = Number(String(input).replace(/[^0-9.]/g, ''));
  if (!isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

export function normaliseLocation(input: string): string {
  return cleanText(input).
  replace(/[^a-zA-Z\s]/g, '').
  split(' ').
  filter(Boolean).
  map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).
  join(' ');
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

/* ------------------------------ model state ----------------------------- */

let forest: IsolationForest | null = null;
let forestTrainingRows = 0;
let vectorCache = new Map<string, number[]>();
let booted = false;
let bootError: string | null = null;

function vec(text: string): number[] {
  const key = text.slice(0, 240);
  const cached = vectorCache.get(key);
  if (cached) return cached;
  const v = encode(text);
  vectorCache.set(key, v);
  return v;
}

function typeIndex(type: ServiceType): number {
  return Math.max(0, SERVICE_TYPES.indexOf(type)) / (SERVICE_TYPES.length - 1);
}

/** feature vector fed to the Isolation Forest */
function priceFeatureVector(args: {
  quoted: number;
  benchmark: number;
  type: ServiceType;
  locationRisk: number;
  lat: number;
  lng: number;
}): number[] {
  const ratio = args.quoted / Math.max(args.benchmark, 1);
  const deviation = (args.quoted - args.benchmark) / Math.max(args.benchmark, 1);
  return [
  ratio,
  deviation,
  Math.log10(Math.max(args.quoted, 1)) / 6,
  typeIndex(args.type),
  args.locationRisk,
  args.lat / 90,
  args.lng / 180];

}

function mulberry32(seed: number) {
  return function rng() {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Training matrix: observed quote distribution per (city, service type),
 * generated deterministically around each benchmark with a heavier right tail,
 * plus the actual paid prices captured in filed reports.
 */
function buildTrainingMatrix(): number[][] {
  const db = getDb();
  const rng = mulberry32(7);
  const rows: number[][] = [];

  db.price_benchmarks.forEach((bench) => {
    const loc = locationById(bench.location_id);
    if (!loc) return;
    for (let i = 0; i < 24; i++) {
      const noise = (rng() - 0.5) * 0.34 + (rng() < 0.12 ? rng() * 0.3 : 0);
      const quoted = Math.max(200, bench.benchmark_price * (1 + noise));
      rows.push(
        priceFeatureVector({
          quoted,
          benchmark: bench.benchmark_price,
          type: bench.service_type,
          locationRisk: loc.location_risk_index,
          lat: loc.lat,
          lng: loc.lng
        })
      );
    }
  });

  db.service_reports.forEach((rep) => {
    const svc = serviceById(rep.service_id);
    const loc = locationById(rep.location_id);
    if (!svc || !loc || !rep.paid_price) return;
    const bench = benchmarkFor(loc.id, svc.service_type);
    if (!bench) return;
    rows.push(
      priceFeatureVector({
        quoted: rep.paid_price,
        benchmark: bench.benchmark_price,
        type: svc.service_type,
        locationRisk: loc.location_risk_index,
        lat: svc.lat,
        lng: svc.lng
      })
    );
  });

  return rows;
}

export function bootPipeline(): void {
  if (booted) return;
  try {
    const db = getDb();
    const corpus = [
    ...db.complaints.map((c) => c.text),
    ...db.reviews.map((r: any) => r.text as string),
    ...db.service_reports.map((r) => r.description)];

    fitCorpus(corpus);
    vectorCache = new Map();

    const matrix = buildTrainingMatrix();
    forestTrainingRows = matrix.length;
    forest = new IsolationForest(120, 128, 42).fit(matrix);
    booted = true;
    bootError = null;
  } catch (err) {
    bootError = err instanceof Error ? err.message : 'unknown model error';
    booted = false;
  }
}

/** Re-train after data changes (new report filed, service added). */
export function refreshPipeline(): void {
  booted = false;
  bootPipeline();
}

export function modelInfo() {
  return {
    embedding_model: 'hashing-sentence-encoder-256d',
    embedding_dimensions: 256,
    anomaly_model: 'IsolationForest',
    anomaly_trees: forest?.size() ?? 0,
    anomaly_training_rows: forestTrainingRows,
    anomaly_features: [
    'price_ratio',
    'price_deviation',
    'log_quoted_price',
    'service_type',
    'location_risk_index',
    'latitude',
    'longitude'],

    fitted: Boolean(forest?.isFitted()),
    error: bootError
  };
}

/* ----------------------------- signal helpers --------------------------- */

interface AnalyzeInput {
  service_id?: number | null;
  service_name: string;
  service_type: ServiceType;
  city: string;
  quoted_price: number;
  text?: string;
}

function recencyWeight(iso: string, halfLifeDays: number): number {
  return Math.pow(0.5, daysSince(iso) / halfLifeDays);
}

function maxPairwiseSimilarity(texts: string[]): number {
  if (texts.length < 2) return 0;
  const vectors = texts.slice(0, 12).map(vec);
  let max = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const s = cosineSimilarity(vectors[i], vectors[j]);
      if (s > max) max = s;
    }
  }
  return max;
}

function levelFor(score: number): RiskLevel {
  const { low_max, medium_max } = getDb().risk_config;
  if (score <= low_max) return 'LOW RISK';
  if (score <= medium_max) return 'MEDIUM RISK';
  return 'HIGH RISK';
}

export function riskLevelFor(score: number): RiskLevel {
  return levelFor(score);
}

/* -------------------------------- analysis ------------------------------ */

export function analyze(input: AnalyzeInput, includeAlternatives = true) {
  bootPipeline();
  const db = getDb();
  const weights = db.risk_config.weights;

  // --- DATA COLLECTION -------------------------------------------------
  const cityName = normaliseLocation(input.city);
  const matchedService =
  serviceById(input.service_id ?? null) ||
  db.tourism_services.find(
    (s) =>
    s.name.toLowerCase() === input.service_name.trim().toLowerCase() &&
    s.service_type === input.service_type
  );

  const location =
  locationById(matchedService?.location_id) || locationByCity(cityName) || db.locations[0];
  const bench = benchmarkFor(location.id, input.service_type);
  const benchmarkPrice = bench?.benchmark_price ?? 3000;
  const lat = matchedService?.lat ?? location.lat;
  const lng = matchedService?.lng ?? location.lng;

  const serviceComplaints = matchedService ?
  db.complaints.filter((c) => c.service_id === matchedService.id) :
  [];
  const cityTypeComplaints = db.complaints.filter((c) => {
    const svc = serviceById(c.service_id);
    return svc && svc.location_id === location.id && svc.service_type === input.service_type;
  });
  const serviceReports = matchedService ?
  db.service_reports.filter((r) => r.service_id === matchedService.id) :
  [];
  const serviceReviews = matchedService ?
  db.reviews.filter((r: any) => r.service_id === matchedService.id) :
  [];
  const serviceIncidents = matchedService ?
  db.incident_reports.filter((i) => i.service_id === matchedService.id) :
  [];
  const areaIncidents = db.incident_reports.filter(
    (i) => i.location_id === location.id && i.service_id === null
  );

  // --- PREPROCESSING + FEATURE EXTRACTION ------------------------------
  const quoted = input.quoted_price;
  const deviationPct = (quoted - benchmarkPrice) / benchmarkPrice * 100;
  const userText = cleanText(input.text || '');

  const featureVector = priceFeatureVector({
    quoted,
    benchmark: benchmarkPrice,
    type: input.service_type,
    locationRisk: location.location_risk_index,
    lat,
    lng
  });

  // --- AI ANALYSIS: Isolation Forest -----------------------------------
  const anomalyScore = forest?.isFitted() ? forest.score(featureVector) : 0.5;
  const anomalyStrength = clamp((anomalyScore - 0.5) / 0.16);
  const deviationStrength = clamp((deviationPct - 12) / 70);
  const priceStrength = clamp(Math.max(anomalyStrength * 0.65 + deviationStrength * 0.55, 0));

  // --- AI ANALYSIS: sentence embeddings --------------------------------
  const complaintPool = [
  ...serviceComplaints.map((c) => ({ text: c.text, created_at: c.created_at })),
  ...serviceReports.map((r) => ({ text: r.description, created_at: r.created_at })),
  ...cityTypeComplaints.map((c) => ({ text: c.text, created_at: c.created_at }))];


  const queryText =
  userText ||
  serviceComplaints[0]?.text ||
  `${input.service_type} in ${location.city} price ${quoted} rupees overcharge`;
  const queryVec = vec(queryText);

  const scored = complaintPool.
  map((c) => ({ ...c, similarity: cosineSimilarity(queryVec, vec(c.text)) })).
  sort((a, b) => b.similarity - a.similarity);

  const similarComplaints = scored.
  filter((c) => c.similarity > 0.28).
  slice(0, 4).
  map((c) => ({ text: c.text, similarity: Number(c.similarity.toFixed(3)), created_at: c.created_at }));

  const topSimilarity = scored[0]?.similarity ?? 0;
  const recurringCount = scored.filter((c) => c.similarity > 0.42).length;
  const similarityStrength = clamp(topSimilarity / 0.72) * clamp(0.45 + recurringCount * 0.22);

  const reviewSimilarity = maxPairwiseSimilarity(serviceReviews.map((r: any) => r.text));
  const reviewStrength = clamp((reviewSimilarity - 0.45) / 0.4);

  // --- rule signals -----------------------------------------------------
  const frequencyRaw =
  [...serviceComplaints, ...serviceReports].reduce(
    (sum, c: any) => sum + recencyWeight(c.created_at, 30),
    0
  ) +
  cityTypeComplaints.reduce((sum, c) => sum + recencyWeight(c.created_at, 30) * 0.18, 0);
  const frequencyStrength = clamp(frequencyRaw / 4.5);

  const incidentRaw =
  serviceIncidents.reduce((sum, i) => sum + i.severity * recencyWeight(i.created_at, 45), 0) +
  areaIncidents.reduce((sum, i) => sum + i.severity * recencyWeight(i.created_at, 45) * 0.3, 0);
  const incidentStrength = clamp(incidentRaw / 4);

  const locationStrength = clamp((location.location_risk_index - 0.3) / 0.45);

  const tenureStrength = matchedService ?
  clamp((matchedService.registered ? 0 : 0.6) + (matchedService.years_active < 3 ? 0.4 : 0)) :
  0.45; // unlisted service — no verifiable history
  const contextMonth = new Date().getMonth() + 1;
  const peakSeason = location.peak_months.includes(contextMonth);

  // --- RISK ENGINE -------------------------------------------------------
  const raw: SignalContribution[] = [
  {
    key: 'price_anomaly',
    label: 'Price anomaly',
    points: weights.price_anomaly * priceStrength,
    source: 'model',
    detail:
    deviationPct > 8 ?
    `Quoted ₹${quoted.toLocaleString('en-IN')} is ${Math.round(deviationPct)}% above the ₹${benchmarkPrice.toLocaleString('en-IN')} local benchmark (Isolation Forest score ${anomalyScore.toFixed(2)}).` :
    `Quoted price sits close to the ₹${benchmarkPrice.toLocaleString('en-IN')} local benchmark (Isolation Forest score ${anomalyScore.toFixed(2)}).`
  },
  {
    key: 'complaint_similarity',
    label: 'Complaint similarity',
    points: weights.complaint_similarity * similarityStrength,
    source: 'model',
    detail: recurringCount ?
    `${recurringCount} past complaints are semantically close to this case (top cosine ${topSimilarity.toFixed(2)}).` :
    `No strongly matching complaint found in the corpus (top cosine ${topSimilarity.toFixed(2)}).`
  },
  {
    key: 'complaint_frequency',
    label: 'Recent complaint frequency',
    points: weights.complaint_frequency * frequencyStrength,
    source: 'rule',
    detail: `${serviceComplaints.length + serviceReports.length} records on file for this service, recency-weighted over a 30-day half-life.`
  },
  {
    key: 'incident_signal',
    label: 'Incident signal',
    points: weights.incident_signal * incidentStrength,
    source: 'rule',
    detail: serviceIncidents.length ?
    `${serviceIncidents.length} incident record(s) logged against this service, plus ${areaIncidents.length} in the surrounding area.` :
    `No incident record against this service; ${areaIncidents.length} area-level record(s) considered.`
  },
  {
    key: 'review_pattern',
    label: 'Review similarity pattern',
    points: weights.review_pattern * reviewStrength,
    source: 'model',
    detail:
    reviewSimilarity > 0.5 ?
    `Reviews show near-duplicate phrasing (max pairwise cosine ${reviewSimilarity.toFixed(2)}).` :
    `Review wording is varied (max pairwise cosine ${reviewSimilarity.toFixed(2)}).`
  },
  {
    key: 'location_context',
    label: 'Location & season context',
    points: weights.location_context * locationStrength * (peakSeason ? 1.15 : 0.85),
    source: 'rule',
    detail: `${location.city} carries a ${(location.location_risk_index * 100).toFixed(0)}/100 area signal${peakSeason ? ' and is currently in peak season' : ' and is off-peak right now'}.`
  },
  {
    key: 'service_type',
    label: 'Registration & tenure',
    points: weights.service_type * tenureStrength,
    source: 'rule',
    detail: matchedService ?
    `${matchedService.registered ? 'Registered' : 'Not registered'} operator, active ${matchedService.years_active} year(s).` :
    'Service is not in the verified registry, so no tenure history could be used.'
  }];


  const contributions = raw.
  map((c) => ({ ...c, points: Math.round(c.points) })).
  sort((a, b) => b.points - a.points);

  const riskScore = Math.max(
    0,
    Math.min(100, Math.round(contributions.reduce((s, c) => s + c.points, 0)))
  );
  const riskLevel = levelFor(riskScore);

  // --- YATRATRUST SCORE (long-run service quality) ----------------------
  const avgRating = serviceReviews.length ?
  serviceReviews.reduce((s: number, r: any) => s + r.rating, 0) / serviceReviews.length :
  3.4;
  const lifetimeComplaintRate = matchedService ?
  (serviceComplaints.length + serviceReports.length) / Math.max(matchedService.years_active, 1) :
  2;

  let trust = 100;
  const trustSignals: string[] = [];

  if (Math.abs(deviationPct) <= 15) {
    trustSignals.push('Pricing aligned with the local benchmark');
  } else {
    trust -= clamp(Math.abs(deviationPct) / 100) * 22;
    trustSignals.push(`Pricing ${deviationPct > 0 ? 'above' : 'below'} the local benchmark by ${Math.abs(Math.round(deviationPct))}%`);
  }

  if (lifetimeComplaintRate < 1) trustSignals.push('Low complaint volume relative to time in service');else
  {
    trust -= clamp(lifetimeComplaintRate / 5) * 24;
    trustSignals.push(`${lifetimeComplaintRate.toFixed(1)} complaints per active year on record`);
  }

  if (avgRating >= 4) trustSignals.push(`Consistent service feedback (${avgRating.toFixed(1)}/5 average)`);else
  {
    trust -= (4 - avgRating) * 8;
    trustSignals.push(`Mixed service feedback (${avgRating.toFixed(1)}/5 average)`);
  }

  if (reviewSimilarity > 0.5) {
    trust -= 12;
    trustSignals.push('Review wording shows repetitive patterns');
  } else trustSignals.push('No repetitive review pattern detected');

  if (serviceIncidents.length === 0) trustSignals.push('No incident pattern against this service');else
  {
    trust -= Math.min(20, serviceIncidents.length * 7);
    trustSignals.push(`${serviceIncidents.length} incident record(s) on file`);
  }

  if (matchedService?.registered) {
    trustSignals.push(`Verified registry entry, active ${matchedService.years_active} year(s)`);
  } else {
    trust -= matchedService ? 14 : 20;
    trustSignals.push(matchedService ? 'Operator is not in the verified registry' : 'Service not found in the verified registry');
  }

  const trustScore = Math.max(0, Math.min(100, Math.round(trust)));
  const trustLabel = trustScore >= 75 ? 'TRUSTED' : trustScore >= 50 ? 'MIXED SIGNALS' : 'LOW TRUST';

  // --- safer alternatives (PostGIS-style radius query) ------------------
  const alternatives = (includeAlternatives ?
  servicesWithin({ lat, lng }, 60, (s) => s.service_type === input.service_type && s.id !== matchedService?.id) :
  []).
  map(({ service, distance_km }) => {
    const profile = serviceProfile(service.id);
    const b = benchmarkFor(service.location_id, service.service_type);
    return {
      service_id: service.id,
      name: service.name,
      service_type: service.service_type,
      trust_score: profile.trust_score,
      risk_score: profile.risk_score,
      benchmark_price: b?.benchmark_price ?? benchmarkPrice,
      distance_km: Number(distance_km.toFixed(1))
    };
  }).
  filter((a) => a.risk_score < riskScore || a.trust_score > trustScore).
  sort((a, b) => b.trust_score - a.trust_score).
  slice(0, 4);

  return {
    service_id: matchedService?.id ?? null,
    service_name: matchedService?.name ?? input.service_name.trim(),
    service_type: input.service_type,
    city: location.city,
    lat,
    lng,
    quoted_price: quoted,
    benchmark_price: benchmarkPrice,
    price_deviation_pct: Number(deviationPct.toFixed(1)),
    risk_score: riskScore,
    risk_level: riskLevel,
    trust_score: trustScore,
    trust_label: trustLabel,
    anomaly_score: Number(anomalyScore.toFixed(3)),
    complaint_similarity: Number(topSimilarity.toFixed(3)),
    similar_complaints: similarComplaints,
    review_similarity: Number(reviewSimilarity.toFixed(3)),
    contributions,
    trust_signals: trustSignals,
    alternatives,
    features: {
      price_ratio: Number((quoted / benchmarkPrice).toFixed(3)),
      price_deviation_pct: Number(deviationPct.toFixed(1)),
      anomaly_score: Number(anomalyScore.toFixed(3)),
      complaint_similarity: Number(topSimilarity.toFixed(3)),
      recurring_matches: recurringCount,
      complaint_frequency_weighted: Number(frequencyRaw.toFixed(2)),
      incident_weighted_severity: Number(incidentRaw.toFixed(2)),
      review_max_similarity: Number(reviewSimilarity.toFixed(3)),
      location_risk_index: location.location_risk_index,
      peak_season: peakSeason ? 1 : 0,
      registered: matchedService?.registered ? 1 : 0,
      years_active: matchedService?.years_active ?? 0
    }
  };
}

/* ------------------------- baseline service profile --------------------- */

const profileCache = new Map<number, {risk_score: number;risk_level: RiskLevel;trust_score: number;trust_label: string;anomaly_score: number;}>();

/**
 * Baseline assessment of a listed service at its own benchmark price — used by
 * the map, hotspots and analytics so every marker carries a real score.
 */
export function serviceProfile(serviceId: number) {
  const cached = profileCache.get(serviceId);
  if (cached) return cached;
  const svc = serviceById(serviceId);
  if (!svc) {
    const fallback = { risk_score: 0, risk_level: 'LOW RISK' as RiskLevel, trust_score: 50, trust_label: 'MIXED SIGNALS', anomaly_score: 0.5 };
    return fallback;
  }
  const loc = locationById(svc.location_id)!;
  const bench = benchmarkFor(loc.id, svc.service_type);
  const db = getDb();
  const paid = db.service_reports.
  filter((r) => r.service_id === svc.id && r.paid_price).
  map((r) => r.paid_price as number);
  const observed = paid.length ?
  Math.round(paid.reduce((a, b) => a + b, 0) / paid.length) :
  bench?.benchmark_price ?? 3000;

  const result = analyzeInternal(svc.id, svc.service_type, loc.city, observed);
  const profile = {
    risk_score: result.risk_score,
    risk_level: result.risk_level,
    trust_score: result.trust_score,
    trust_label: result.trust_label,
    anomaly_score: result.anomaly_score
  };
  profileCache.set(serviceId, profile);
  return profile;
}

function analyzeInternal(serviceId: number, type: ServiceType, city: string, quoted: number) {
  const svc = serviceById(serviceId)!;
  return analyze(
    {
      service_id: serviceId,
      service_name: svc.name,
      service_type: type,
      city,
      quoted_price: quoted
    },
    false // baseline pass: skip the alternatives lookup to keep it non-recursive
  );
}

export function invalidateProfiles(): void {
  profileCache.clear();
}

/* ---------------------------- aggregate views --------------------------- */

export function complaintClusters(limit = 6) {
  bootPipeline();
  const db = getDb();
  const corpus = [
  ...db.complaints.map((c) => ({ id: c.id, text: c.text })),
  ...db.service_reports.map((r) => ({ id: r.id + 10000, text: r.description }))];

  return clusterTexts(corpus, 0.4).
  slice(0, limit).
  map((c) => ({ label: c.label, count: c.members.length }));
}

export function labelForText(text: string): string {
  return conceptLabel(text);
}

export function hotspots() {
  const db = getDb();
  return db.locations.
  map((loc) => {
    const svcs = db.tourism_services.filter((s) => s.location_id === loc.id);
    const profiles = svcs.map((s) => serviceProfile(s.id));
    const high = profiles.filter((p) => p.risk_level === 'HIGH RISK').length;
    const medium = profiles.filter((p) => p.risk_level === 'MEDIUM RISK').length;
    const reports = db.service_reports.filter((r) => r.location_id === loc.id);
    const recentReports = reports.filter((r) => daysSince(r.created_at) <= 30).length;
    const avgRisk = profiles.length ?
    Math.round(profiles.reduce((s, p) => s + p.risk_score, 0) / profiles.length) :
    0;
    const anomalyRatio = profiles.length ?
    profiles.filter((p) => p.anomaly_score > 0.58).length / profiles.length :
    0;
    return {
      location_id: loc.id,
      city: loc.city,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
      avg_risk: avgRisk,
      level: riskLevelFor(avgRisk),
      high_risk_services: high,
      medium_risk_services: medium,
      total_services: svcs.length,
      reports_total: reports.length,
      reports_30d: recentReports,
      price_anomaly_ratio: Number(anomalyRatio.toFixed(2)),
      note:
      high > 1 ?
      'High-risk cluster detected' :
      recentReports >= 2 ?
      'Increasing complaint trend' :
      anomalyRatio > 0.3 ?
      'Price anomaly cluster' :
      'Stable signals'
    };
  }).
  sort((a, b) => b.avg_risk - a.avg_risk);
}

export function nearestCityDistance(point: {lat: number;lng: number;}) {
  const db = getDb();
  return db.locations.
  map((l) => ({ city: l.city, km: distanceKm(point, l) })).
  sort((a, b) => a.km - b.km)[0];
}