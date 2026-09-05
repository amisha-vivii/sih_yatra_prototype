/**
 * Data layer
 * ----------
 * A relational, table-per-entity store with primary keys, foreign keys,
 * secondary indexes and geo queries — mirroring the PostgreSQL + PostGIS
 * schema in `database/schema.sql`. Mutations are persisted so reports created
 * by a traveller survive a reload and appear in the authority queue.
 *
 * Distance filtering here uses the haversine formula, which is the same
 * predicate `ST_DWithin(geography, geography, meters)` evaluates in PostGIS.
 */

import { hashPassword, makeSalt } from '../lib/crypto';
import {
  complaints as seedComplaints,
  demoUsers,
  incidents as seedIncidents,
  locations as seedLocations,
  priceBenchmarks as seedBenchmarks,
  reviews as seedReviews,
  seedReports,
  services as seedServices } from
'../data/seed';
import type {
  AuditLogRecord,
  ComplaintRecord,
  IncidentRecord,
  LocationRecord,
  PriceBenchmarkRecord,
  RiskAssessmentRecord,
  ReviewRecord,
  RiskConfig,
  RoleRecord,
  SavedServiceRecord,
  ServiceRecord,
  ServiceReportRecord,
  ServiceType,
  UserRecord } from
'../types';

const STORAGE_KEY = 'yatrashield.db.v1';

export interface Database {
  roles: RoleRecord[];
  users: UserRecord[];
  locations: LocationRecord[];
  tourism_services: ServiceRecord[];
  price_benchmarks: PriceBenchmarkRecord[];
  reviews: ReviewRecord[];
  complaints: ComplaintRecord[];
  incident_reports: IncidentRecord[];
  service_reports: ServiceReportRecord[];
  risk_assessments: RiskAssessmentRecord[];
  saved_services: SavedServiceRecord[];
  audit_logs: AuditLogRecord[];
  risk_config: RiskConfig;
  sequences: Record<string, number>;
  revoked_tokens: string[];
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  low_max: 30,
  medium_max: 60,
  weights: {
    price_anomaly: 26,
    complaint_similarity: 22,
    complaint_frequency: 18,
    incident_signal: 14,
    review_pattern: 12,
    location_context: 8,
    service_type: 8
  }
};

function buildFresh(): Database {
  const roles: RoleRecord[] = [
  { id: 1, name: 'admin', description: 'Tourism authority operator with full analytics and case management access' },
  { id: 2, name: 'tourist', description: 'Traveller with access to trust checks, map, and their own reports' }];


  const users: UserRecord[] = demoUsers.map((u) => {
    const salt = makeSalt();
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role_id: u.role === 'admin' ? 1 : 2,
      password_salt: salt,
      password_hash: hashPassword(u.password, salt),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
      home_city: u.home_city,
      phone: u.phone
    };
  });

  return {
    roles,
    users,
    locations: seedLocations.map((l) => ({ ...l })),
    tourism_services: seedServices.map((s) => ({ ...s })),
    price_benchmarks: seedBenchmarks.map((b) => ({ ...b })),
    reviews: seedReviews.map((r) => ({ ...r })),
    complaints: seedComplaints.map((c) => ({ ...c })),
    incident_reports: seedIncidents.map((i) => ({ ...i })),
    service_reports: seedReports.map((r) => ({ ...r, cluster_label: null })),
    risk_assessments: [],
    saved_services: [
    { id: 1, user_id: 2, service_id: 1, created_at: new Date().toISOString() },
    { id: 2, user_id: 2, service_id: 20, created_at: new Date().toISOString() }],

    audit_logs: [
    {
      id: 1,
      actor_id: 1,
      action: 'system.bootstrap',
      entity: 'system',
      entity_id: null,
      detail: 'Reference dataset loaded and models trained',
      created_at: new Date().toISOString()
    }],

    risk_config: DEFAULT_RISK_CONFIG,
    sequences: {
      users: 100,
      service_reports: 100,
      risk_assessments: 1,
      saved_services: 100,
      audit_logs: 100,
      tourism_services: 100,
      complaints: 1000
    },
    revoked_tokens: []
  };
}

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed && parsed.users?.length && parsed.tourism_services?.length) {
        db = parsed;
        db.risk_config = { ...DEFAULT_RISK_CONFIG, ...(parsed.risk_config || {}) };
        return db;
      }
    }
  } catch {

    /* corrupted local copy — fall through to a fresh load */}
  db = buildFresh();
  persist();
  return db;
}

export function persist(): void {
  if (!db) return;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {

    /* storage full or unavailable: the store stays in memory for this session */}
}

export function resetDb(): void {
  db = buildFresh();
  persist();
}

export function nextId(table: keyof Database['sequences'] | string): number {
  const d = getDb();
  const current = d.sequences[table] ?? 1;
  d.sequences[table] = current + 1;
  return current + 1;
}

/* ------------------------------- indexes ------------------------------- */

export function indexBy<T, K extends string | number>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  rows.forEach((row) => {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);else
    map.set(k, [row]);
  });
  return map;
}

/* -------------------------------- joins -------------------------------- */

export function locationById(id: number | null | undefined): LocationRecord | undefined {
  if (id == null) return undefined;
  return getDb().locations.find((l) => l.id === id);
}

export function locationByCity(city: string): LocationRecord | undefined {
  const needle = (city || '').trim().toLowerCase();
  if (!needle) return undefined;
  const all = getDb().locations;
  return (
    all.find((l) => l.city.toLowerCase() === needle) ||
    all.find((l) => l.city.toLowerCase().includes(needle) || needle.includes(l.city.toLowerCase())));

}

export function serviceById(id: number | null | undefined): ServiceRecord | undefined {
  if (id == null) return undefined;
  return getDb().tourism_services.find((s) => s.id === id);
}

export function benchmarkFor(locationId: number, type: ServiceType): PriceBenchmarkRecord | undefined {
  const rows = getDb().price_benchmarks;
  return (
    rows.find((b) => b.location_id === locationId && b.service_type === type) ||
    rows.find((b) => b.service_type === type));

}

export function userPublic(user: UserRecord) {
  const role = getDb().roles.find((r) => r.id === user.role_id);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: (role?.name ?? 'tourist') as 'admin' | 'tourist',
    home_city: user.home_city,
    phone: user.phone,
    created_at: user.created_at
  };
}

/* ------------------------------ geo queries ---------------------------- */

export function distanceKm(a: {lat: number;lng: number;}, b: {lat: number;lng: number;}): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h =
  Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** equivalent of: SELECT * FROM tourism_services WHERE ST_DWithin(geom, :point, :radius) */
export function servicesWithin(
point: {lat: number;lng: number;},
radiusKm: number,
filter?: (s: ServiceRecord) => boolean)
: {service: ServiceRecord;distance_km: number;}[] {
  return getDb().
  tourism_services.filter((s) => filter ? filter(s) : true).
  map((service) => ({ service, distance_km: distanceKm(point, service) })).
  filter((row) => row.distance_km <= radiusKm).
  sort((a, b) => a.distance_km - b.distance_km);
}

export function audit(actorId: number | null, action: string, entity: string, entityId: number | null, detail: string) {
  const d = getDb();
  d.audit_logs.unshift({
    id: nextId('audit_logs'),
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    detail,
    created_at: new Date().toISOString()
  });
  d.audit_logs = d.audit_logs.slice(0, 200);
  persist();
}