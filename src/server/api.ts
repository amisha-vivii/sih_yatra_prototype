/**
 * Service layer (HTTP-shaped API)
 * -------------------------------
 * Every screen talks to the product through `request(method, path, options)`,
 * which routes to a handler, enforces bearer-token authentication and
 * role-based authorization, validates payloads, and returns
 * `{ status, data }`. Authorization is decided HERE, not in the UI: a
 * traveller's token hitting any `/api/admin/*` route gets a real 403 even if
 * the request is issued by hand.
 *
 * Route table matches the FastAPI routers in `backend/app/api/`.
 */

import { hashPassword, makeSalt, signToken, verifyPassword, verifyToken } from '../lib/crypto';
import {
  audit,
  benchmarkFor,
  DEFAULT_RISK_CONFIG,
  distanceKm,
  getDb,
  locationByCity,
  locationById,
  nextId,
  persist,
  serviceById,
  servicesWithin,
  userPublic } from
'./db';
import {
  analyze,
  bootPipeline,
  cleanText,
  complaintClusters,
  hotspots,
  invalidateProfiles,
  labelForText,
  modelInfo,
  normalisePrice,
  normaliseLocation,
  refreshPipeline,
  serviceProfile } from
'../ml/pipeline';
import { REPORT_CATEGORIES, REPORT_STATUSES, SERVICE_TYPES } from '../types';
import type { PublicUser, ReportStatus, ServiceType } from '../types';

const SECRET = (import.meta as any)?.env?.VITE_SECRET_KEY || 'yatrashield-local-dev-secret';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

export interface ApiResponse<T = any> {
  status: number;
  data: T;
}

interface Ctx {
  body: any;
  query: URLSearchParams;
  params: Record<string, string>;
  user: PublicUser | null;
  jti: string | null;
}

class HttpError extends Error {
  constructor(
  public status: number,
  message: string,
  public detail?: Record<string, string>)
  {
    super(message);
  }
}

const ok = <T,>(data: T, status = 200): ApiResponse<T> => ({ status, data });

function requireAuth(ctx: Ctx): PublicUser {
  if (!ctx.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  return ctx.user;
}

function requireRole(ctx: Ctx, role: 'admin' | 'tourist'): PublicUser {
  const user = requireAuth(ctx);
  if (user.role !== role) {
    throw new HttpError(403, 'Forbidden: your account does not have access to this area.');
  }
  return user;
}

/* ------------------------------ validation ----------------------------- */

function str(value: unknown, field: string, { min = 1, max = 400 } = {}): string {
  const v = cleanText(String(value ?? ''));
  if (v.length < min) throw new HttpError(422, `${field} is required.`, { [field]: 'This field is required.' });
  if (v.length > max) throw new HttpError(422, `${field} is too long.`, { [field]: `Keep it under ${max} characters.` });
  return v;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) {
    throw new HttpError(422, `${field} is not a valid choice.`, { [field]: 'Choose one of the listed options.' });
  }
  return value as T;
}

function price(value: unknown, field: string, required = true): number | null {
  const parsed = normalisePrice(value);
  if (parsed === null) {
    if (required) throw new HttpError(422, `${field} must be a positive amount.`, { [field]: 'Enter a valid amount in rupees.' });
    return null;
  }
  if (parsed > 10_000_000) throw new HttpError(422, `${field} looks unrealistic.`, { [field]: 'Enter a realistic amount.' });
  return parsed;
}

/* ------------------------------- handlers ------------------------------ */

type Handler = (ctx: Ctx) => ApiResponse;

const routes: {method: string;pattern: RegExp;keys: string[];handler: Handler;}[] = [];

function route(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' +
    path.
    split('/').
    map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).
    join('/') +
    '$'
  );
  routes.push({ method, pattern, keys, handler });
}

/* -- auth -- */

route('POST', '/api/auth/login', (ctx) => {
  const email = String(ctx.body?.email ?? '').trim().toLowerCase();
  const password = String(ctx.body?.password ?? '');
  if (!email || !password) {
    throw new HttpError(422, 'Enter both your email and password.', {
      email: email ? '' : 'Email is required.',
      password: password ? '' : 'Password is required.'
    });
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    throw new HttpError(401, 'Those credentials do not match an account.');
  }
  const pub = userPublic(user);
  const jti = makeSalt();
  const token = signToken(
    { sub: pub.id, role: pub.role, email: pub.email, jti, exp: Date.now() + TOKEN_TTL_MS },
    SECRET
  );
  audit(pub.id, 'auth.login', 'user', pub.id, `${pub.role} session opened`);
  return ok({ token, user: pub, expires_at: Date.now() + TOKEN_TTL_MS });
});

route('POST', '/api/auth/register', (ctx) => {
  const db = getDb();
  const email = String(ctx.body?.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(422, 'Enter a valid email address.', { email: 'Enter a valid email address.' });
  }
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new HttpError(409, 'An account already exists for this email.', { email: 'This email is already registered.' });
  }
  const password = String(ctx.body?.password ?? '');
  if (password.length < 8) {
    throw new HttpError(422, 'Password must be at least 8 characters.', { password: 'Use at least 8 characters.' });
  }
  const full_name = str(ctx.body?.full_name, 'Full name', { min: 2, max: 80 });
  const salt = makeSalt();
  const user = {
    id: nextId('users'),
    email,
    full_name,
    role_id: 2, // self-service registration is always a traveller account
    password_salt: salt,
    password_hash: hashPassword(password, salt),
    created_at: new Date().toISOString(),
    home_city: normaliseLocation(String(ctx.body?.home_city ?? 'India')) || 'India',
    phone: String(ctx.body?.phone ?? '').slice(0, 20)
  };
  db.users.push(user);
  persist();
  const pub = userPublic(user);
  const jti = makeSalt();
  const token = signToken(
    { sub: pub.id, role: pub.role, email: pub.email, jti, exp: Date.now() + TOKEN_TTL_MS },
    SECRET
  );
  audit(pub.id, 'auth.register', 'user', pub.id, 'traveller account created');
  return ok({ token, user: pub, expires_at: Date.now() + TOKEN_TTL_MS }, 201);
});

route('POST', '/api/auth/logout', (ctx) => {
  const db = getDb();
  if (ctx.jti) {
    db.revoked_tokens.push(ctx.jti);
    db.revoked_tokens = db.revoked_tokens.slice(-200);
    persist();
  }
  if (ctx.user) audit(ctx.user.id, 'auth.logout', 'user', ctx.user.id, 'session token revoked');
  return ok({ revoked: true });
});

route('GET', '/api/auth/me', (ctx) => ok({ user: requireAuth(ctx) }));

/* -- services -- */

route('GET', '/api/services', (ctx) => {
  requireAuth(ctx);
  const db = getDb();
  const q = (ctx.query.get('q') || '').toLowerCase().trim();
  const city = (ctx.query.get('city') || '').toLowerCase().trim();
  const type = ctx.query.get('type') || '';
  const rows = db.tourism_services.
  filter((s) => {
    const loc = locationById(s.location_id);
    if (q && !s.name.toLowerCase().includes(q) && !s.service_type.toLowerCase().includes(q)) return false;
    if (city && !(loc?.city.toLowerCase() ?? '').includes(city)) return false;
    if (type && s.service_type !== type) return false;
    return true;
  }).
  map((s) => {
    const loc = locationById(s.location_id)!;
    const bench = benchmarkFor(loc.id, s.service_type);
    const profile = serviceProfile(s.id);
    return {
      ...s,
      city: loc.city,
      state: loc.state,
      benchmark_price: bench?.benchmark_price ?? null,
      unit: bench?.unit ?? '',
      ...profile
    };
  }).
  sort((a, b) => b.trust_score - a.trust_score);
  return ok({ count: rows.length, results: rows });
});

route('GET', '/api/services/:id', (ctx) => {
  requireAuth(ctx);
  const db = getDb();
  const svc = serviceById(Number(ctx.params.id));
  if (!svc) throw new HttpError(404, 'That service is not in the registry.');
  const loc = locationById(svc.location_id)!;
  const bench = benchmarkFor(loc.id, svc.service_type);
  return ok({
    service: { ...svc, city: loc.city, state: loc.state },
    benchmark: bench ?? null,
    profile: serviceProfile(svc.id),
    reviews: db.reviews.filter((r: any) => r.service_id === svc.id),
    complaints: db.complaints.filter((c) => c.service_id === svc.id),
    incidents: db.incident_reports.filter((i) => i.service_id === svc.id),
    reports: db.service_reports.filter((r) => r.service_id === svc.id).length
  });
});

/* -- risk -- */

route('POST', '/api/risk/analyze', (ctx) => {
  const user = requireRole(ctx, 'tourist');
  const db = getDb();
  const service_name = str(ctx.body?.service_name, 'Service name', { min: 2, max: 120 });
  const service_type = oneOf(ctx.body?.service_type, SERVICE_TYPES, 'Service type');
  const city = str(ctx.body?.location, 'Location', { min: 2, max: 60 });
  const quoted_price = price(ctx.body?.quoted_price, 'Quoted price')!;
  const text = ctx.body?.text ? cleanText(String(ctx.body.text)).slice(0, 1000) : '';

  if (!locationByCity(city)) {
    throw new HttpError(422, `No benchmark coverage for “${city}” yet.`, {
      location: 'Try Jaipur, Agra, Goa, Varanasi, Delhi, Udaipur, Manali or Mumbai.'
    });
  }

  const result = analyze({
    service_id: ctx.body?.service_id ?? null,
    service_name,
    service_type: service_type as ServiceType,
    city,
    quoted_price,
    text
  });

  const record = {
    id: nextId('risk_assessments'),
    user_id: user.id,
    ...result,
    created_at: new Date().toISOString()
  };
  db.risk_assessments.unshift(record as any);
  db.risk_assessments = db.risk_assessments.slice(0, 60);
  persist();
  audit(user.id, 'risk.analyze', 'risk_assessment', record.id, `${service_name} → ${result.risk_score}/100`);
  return ok({ assessment: record }, 201);
});

route('GET', '/api/risk/history', (ctx) => {
  const user = requireAuth(ctx);
  const rows = getDb().risk_assessments.filter((r) => r.user_id === user.id);
  return ok({ count: rows.length, results: rows });
});

route('GET', '/api/risk/:id', (ctx) => {
  const user = requireAuth(ctx);
  const row = getDb().risk_assessments.find((r) => r.id === Number(ctx.params.id));
  if (!row) throw new HttpError(404, 'That analysis is no longer available.');
  if (row.user_id !== user.id && user.role !== 'admin') {
    throw new HttpError(403, 'Forbidden: this analysis belongs to another account.');
  }
  return ok({ assessment: row });
});

/* -- map -- */

route('GET', '/api/map/services', (ctx) => {
  requireAuth(ctx);
  const db = getDb();
  const type = ctx.query.get('type') || '';
  const level = ctx.query.get('level') || '';
  const near = ctx.query.get('near');
  const radius = Number(ctx.query.get('radius_km') || 0);

  let rows = db.tourism_services.map((s) => {
    const loc = locationById(s.location_id)!;
    const bench = benchmarkFor(loc.id, s.service_type);
    return {
      id: s.id,
      name: s.name,
      service_type: s.service_type,
      city: loc.city,
      state: loc.state,
      lat: s.lat,
      lng: s.lng,
      address: s.address,
      registered: s.registered,
      benchmark_price: bench?.benchmark_price ?? null,
      unit: bench?.unit ?? '',
      ...serviceProfile(s.id)
    };
  });

  if (type) rows = rows.filter((r) => r.service_type === type);
  if (level) rows = rows.filter((r) => r.risk_level === level);
  if (near && radius > 0) {
    const loc = locationByCity(near);
    if (loc) {
      rows = rows.filter((r) => distanceKm(loc, r) <= radius);
    }
  }
  return ok({ count: rows.length, results: rows });
});

route('GET', '/api/map/hotspots', (ctx) => {
  requireAuth(ctx);
  return ok({ results: hotspots() });
});

route('GET', '/api/map/nearby', (ctx) => {
  requireAuth(ctx);
  const lat = Number(ctx.query.get('lat'));
  const lng = Number(ctx.query.get('lng'));
  const radius = Number(ctx.query.get('radius_km') || 15);
  if (!isFinite(lat) || !isFinite(lng)) throw new HttpError(422, 'A valid latitude and longitude are required.');
  const rows = servicesWithin({ lat, lng }, radius).map(({ service, distance_km }) => ({
    id: service.id,
    name: service.name,
    service_type: service.service_type,
    distance_km: Number(distance_km.toFixed(2)),
    ...serviceProfile(service.id)
  }));
  return ok({ count: rows.length, results: rows });
});

/* -- reports (traveller) -- */

route('POST', '/api/reports', (ctx) => {
  const user = requireRole(ctx, 'tourist');
  const db = getDb();
  const service_name = str(ctx.body?.service_name, 'Service', { min: 2, max: 120 });
  const cityInput = str(ctx.body?.location, 'Location', { min: 2, max: 60 });
  const category = oneOf(ctx.body?.category, REPORT_CATEGORIES, 'Category');
  const description = str(ctx.body?.description, 'Description', { min: 20, max: 1000 });
  const paid_price = price(ctx.body?.paid_price, 'Amount paid', false);
  const incident_date = String(ctx.body?.incident_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incident_date)) {
    throw new HttpError(422, 'Choose the date this happened.', { incident_date: 'Pick a valid date.' });
  }
  if (new Date(incident_date).getTime() > Date.now() + 86400000) {
    throw new HttpError(422, 'The date cannot be in the future.', { incident_date: 'Pick a date in the past.' });
  }

  const loc = locationByCity(cityInput);
  const matched =
  serviceById(ctx.body?.service_id ?? null) ||
  db.tourism_services.find((s) => s.name.toLowerCase() === service_name.toLowerCase());

  const record = {
    id: nextId('service_reports'),
    user_id: user.id,
    service_id: matched?.id ?? null,
    service_name: matched?.name ?? service_name,
    location_id: loc?.id ?? null,
    city: loc?.city ?? normaliseLocation(cityInput),
    category,
    description,
    paid_price,
    incident_date,
    evidence_name: ctx.body?.evidence_name ? String(ctx.body.evidence_name).slice(0, 120) : null,
    status: 'Pending' as ReportStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    admin_note: null,
    cluster_label: labelForText(description)
  };
  db.service_reports.unshift(record);
  persist();

  // new evidence changes the signal base: retrain the models and drop caches
  invalidateProfiles();
  refreshPipeline();
  audit(user.id, 'report.create', 'service_report', record.id, `${category} · ${record.city}`);
  return ok({ report: record }, 201);
});

route('GET', '/api/reports', (ctx) => {
  const user = requireAuth(ctx);
  const rows = getDb().
  service_reports.filter((r) => r.user_id === user.id).
  sort((a, b) => b.created_at.localeCompare(a.created_at));
  return ok({ count: rows.length, results: rows });
});

/* -- saved services -- */

route('GET', '/api/saved', (ctx) => {
  const user = requireAuth(ctx);
  const db = getDb();
  const rows = db.saved_services.
  filter((s) => s.user_id === user.id).
  map((s) => {
    const svc = serviceById(s.service_id);
    if (!svc) return null;
    const loc = locationById(svc.location_id)!;
    const bench = benchmarkFor(loc.id, svc.service_type);
    return {
      saved_id: s.id,
      id: svc.id,
      name: svc.name,
      service_type: svc.service_type,
      city: loc.city,
      benchmark_price: bench?.benchmark_price ?? null,
      unit: bench?.unit ?? '',
      ...serviceProfile(svc.id)
    };
  }).
  filter(Boolean);
  return ok({ count: rows.length, results: rows });
});

route('POST', '/api/saved', (ctx) => {
  const user = requireRole(ctx, 'tourist');
  const db = getDb();
  const serviceId = Number(ctx.body?.service_id);
  if (!serviceById(serviceId)) throw new HttpError(404, 'That service is not in the registry.');
  if (db.saved_services.some((s) => s.user_id === user.id && s.service_id === serviceId)) {
    return ok({ saved: true, already: true });
  }
  db.saved_services.push({
    id: nextId('saved_services'),
    user_id: user.id,
    service_id: serviceId,
    created_at: new Date().toISOString()
  });
  persist();
  return ok({ saved: true }, 201);
});

route('DELETE', '/api/saved/:id', (ctx) => {
  const user = requireAuth(ctx);
  const db = getDb();
  const before = db.saved_services.length;
  db.saved_services = db.saved_services.filter(
    (s) => !(s.user_id === user.id && s.service_id === Number(ctx.params.id))
  );
  persist();
  return ok({ removed: before !== db.saved_services.length });
});

/* -- admin -- */

route('GET', '/api/admin/reports', (ctx) => {
  requireRole(ctx, 'admin');
  const db = getDb();
  const status = ctx.query.get('status') || '';
  const category = ctx.query.get('category') || '';
  const city = (ctx.query.get('city') || '').toLowerCase();
  const q = (ctx.query.get('q') || '').toLowerCase();
  const rows = db.service_reports.
  filter((r) => {
    if (status && r.status !== status) return false;
    if (category && r.category !== category) return false;
    if (city && !r.city.toLowerCase().includes(city)) return false;
    if (q && !`${r.service_name} ${r.description} ${r.city}`.toLowerCase().includes(q)) return false;
    return true;
  }).
  map((r) => ({
    ...r,
    cluster_label: r.cluster_label ?? labelForText(r.description),
    reporter: db.users.find((u) => u.id === r.user_id)?.full_name ?? 'Traveller',
    service_profile: r.service_id ? serviceProfile(r.service_id) : null
  })).
  sort((a, b) => b.created_at.localeCompare(a.created_at));
  return ok({ count: rows.length, results: rows });
});

route('PATCH', '/api/admin/reports/:id', (ctx) => {
  const admin = requireRole(ctx, 'admin');
  const db = getDb();
  const report = db.service_reports.find((r) => r.id === Number(ctx.params.id));
  if (!report) throw new HttpError(404, 'That report no longer exists.');
  if (ctx.body?.status !== undefined) {
    report.status = oneOf(ctx.body.status, REPORT_STATUSES, 'Status');
  }
  if (ctx.body?.admin_note !== undefined) {
    report.admin_note = ctx.body.admin_note ? cleanText(String(ctx.body.admin_note)).slice(0, 500) : null;
  }
  report.updated_at = new Date().toISOString();
  persist();
  audit(admin.id, 'report.update', 'service_report', report.id, `status → ${report.status}`);
  return ok({ report });
});

route('GET', '/api/admin/services', (ctx) => {
  requireRole(ctx, 'admin');
  const db = getDb();
  const rows = db.tourism_services.map((s) => {
    const loc = locationById(s.location_id)!;
    const bench = benchmarkFor(loc.id, s.service_type);
    return {
      ...s,
      city: loc.city,
      state: loc.state,
      benchmark_price: bench?.benchmark_price ?? null,
      reports: db.service_reports.filter((r) => r.service_id === s.id).length,
      complaints: db.complaints.filter((c) => c.service_id === s.id).length,
      ...serviceProfile(s.id)
    };
  });
  return ok({ count: rows.length, results: rows });
});

route('POST', '/api/admin/services', (ctx) => {
  const admin = requireRole(ctx, 'admin');
  const db = getDb();
  const name = str(ctx.body?.name, 'Name', { min: 3, max: 120 });
  const service_type = oneOf(ctx.body?.service_type, SERVICE_TYPES, 'Service type');
  const city = str(ctx.body?.city, 'City', { min: 2, max: 60 });
  const loc = locationByCity(city);
  if (!loc) {
    throw new HttpError(422, `No location record for “${city}”.`, {
      city: 'Use one of the covered cities.'
    });
  }
  const record = {
    id: nextId('tourism_services'),
    name,
    service_type: service_type as ServiceType,
    location_id: loc.id,
    lat: Number(ctx.body?.lat ?? loc.lat),
    lng: Number(ctx.body?.lng ?? loc.lng),
    address: str(ctx.body?.address || `${loc.city}, ${loc.state}`, 'Address', { min: 3, max: 160 }),
    registered: Boolean(ctx.body?.registered ?? true),
    years_active: Math.max(0, Math.min(60, Number(ctx.body?.years_active ?? 1))),
    created_at: new Date().toISOString().slice(0, 10)
  };
  db.tourism_services.push(record);
  persist();
  invalidateProfiles();
  refreshPipeline();
  audit(admin.id, 'service.create', 'tourism_service', record.id, `${record.name} · ${loc.city}`);
  return ok({ service: record }, 201);
});

route('PATCH', '/api/admin/services/:id', (ctx) => {
  const admin = requireRole(ctx, 'admin');
  const db = getDb();
  const svc = db.tourism_services.find((s) => s.id === Number(ctx.params.id));
  if (!svc) throw new HttpError(404, 'That service no longer exists.');
  if (ctx.body?.name !== undefined) svc.name = str(ctx.body.name, 'Name', { min: 3, max: 120 });
  if (ctx.body?.service_type !== undefined) svc.service_type = oneOf(ctx.body.service_type, SERVICE_TYPES, 'Service type') as ServiceType;
  if (ctx.body?.registered !== undefined) svc.registered = Boolean(ctx.body.registered);
  if (ctx.body?.years_active !== undefined) svc.years_active = Math.max(0, Math.min(60, Number(ctx.body.years_active)));
  if (ctx.body?.address !== undefined) svc.address = str(ctx.body.address, 'Address', { min: 3, max: 160 });
  if (ctx.body?.city !== undefined) {
    const loc = locationByCity(String(ctx.body.city));
    if (!loc) throw new HttpError(422, 'Unknown city.', { city: 'Use one of the covered cities.' });
    svc.location_id = loc.id;
  }
  persist();
  invalidateProfiles();
  audit(admin.id, 'service.update', 'tourism_service', svc.id, `${svc.name} updated`);
  return ok({ service: svc });
});

route('DELETE', '/api/admin/services/:id', (ctx) => {
  const admin = requireRole(ctx, 'admin');
  const db = getDb();
  const id = Number(ctx.params.id);
  const svc = serviceById(id);
  if (!svc) throw new HttpError(404, 'That service no longer exists.');
  db.tourism_services = db.tourism_services.filter((s) => s.id !== id);
  db.saved_services = db.saved_services.filter((s) => s.service_id !== id);
  db.service_reports.forEach((r) => {
    if (r.service_id === id) r.service_id = null;
  });
  persist();
  invalidateProfiles();
  audit(admin.id, 'service.delete', 'tourism_service', id, `${svc.name} removed from registry`);
  return ok({ removed: true });
});

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

route('GET', '/api/admin/analytics', (ctx) => {
  requireRole(ctx, 'admin');
  const db = getDb();

  const timelineSource = [
  ...db.complaints.map((c) => ({ at: c.created_at, category: c.category })),
  ...db.service_reports.map((r) => ({ at: r.created_at, category: r.category }))];


  const weeks: string[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weeks.push(weekKey(d.toISOString()));
  }
  const complaints_over_time = weeks.map((w) => ({
    week: w.slice(5),
    complaints: timelineSource.filter((t) => weekKey(t.at) === w).length
  }));

  const profiles = db.tourism_services.map((s) => serviceProfile(s.id));
  const risk_distribution = [
  { level: 'Low', count: profiles.filter((p) => p.risk_level === 'LOW RISK').length },
  { level: 'Medium', count: profiles.filter((p) => p.risk_level === 'MEDIUM RISK').length },
  { level: 'High', count: profiles.filter((p) => p.risk_level === 'HIGH RISK').length }];


  const service_categories = SERVICE_TYPES.map((type) => {
    const svcs = db.tourism_services.filter((s) => s.service_type === type);
    const ps = svcs.map((s) => serviceProfile(s.id));
    const reports = db.service_reports.filter((r) => {
      const svc = serviceById(r.service_id);
      return svc?.service_type === type;
    });
    const recent = reports.filter((r) => Date.now() - new Date(r.created_at).getTime() <= 30 * 86400000).length;
    const older = reports.length - recent;
    const avgTrust = ps.length ? Math.round(ps.reduce((s, p) => s + p.trust_score, 0) / ps.length) : 0;
    const anomalyRatio = ps.length ? ps.filter((p) => p.anomaly_score > 0.58).length / ps.length : 0;
    return {
      type,
      services: svcs.length,
      reports: reports.length,
      reports_30d: recent,
      complaint_trend: recent - older > 0 ? 'up' : recent === 0 ? 'flat' : 'down',
      avg_trust: avgTrust,
      avg_risk: ps.length ? Math.round(ps.reduce((s, p) => s + p.risk_score, 0) / ps.length) : 0,
      price_anomaly_ratio: Number(anomalyRatio.toFixed(2))
    };
  });

  const months: {key: string;label: string;}[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' })
    });
  }
  const price_anomaly_trend = months.map(({ key, label }) => {
    const rows = db.service_reports.filter((r) => r.created_at.slice(0, 7) === key && r.paid_price);
    const deviations = rows.
    map((r) => {
      const svc = serviceById(r.service_id);
      const loc = locationById(r.location_id);
      if (!svc || !loc) return null;
      const bench = benchmarkFor(loc.id, svc.service_type);
      if (!bench) return null;
      return ((r.paid_price as number) - bench.benchmark_price) / bench.benchmark_price * 100;
    }).
    filter((v): v is number => v !== null);
    return {
      month: label,
      avg_deviation: deviations.length ? Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length) : 0,
      flagged: deviations.filter((d) => d > 25).length
    };
  });

  const complaint_categories = REPORT_CATEGORIES.map((category) => ({
    category,
    count:
    db.complaints.filter((c) => c.category === category).length +
    db.service_reports.filter((r) => r.category === category).length
  })).sort((a, b) => b.count - a.count);

  return ok({
    complaints_over_time,
    risk_distribution,
    service_categories,
    price_anomaly_trend,
    complaint_categories,
    clusters: complaintClusters(6)
  });
});

route('GET', '/api/admin/hotspots', (ctx) => {
  requireRole(ctx, 'admin');
  return ok({ results: hotspots() });
});

route('GET', '/api/admin/stats', (ctx) => {
  requireRole(ctx, 'admin');
  const db = getDb();
  const profiles = db.tourism_services.map((s) => serviceProfile(s.id));
  const spots = hotspots();
  return ok({
    total_reports: db.service_reports.length,
    pending_reports: db.service_reports.filter((r) => r.status === 'Pending').length,
    under_review: db.service_reports.filter((r) => r.status === 'Under Review').length,
    resolved_reports: db.service_reports.filter((r) => r.status === 'Resolved').length,
    high_risk_services: profiles.filter((p) => p.risk_level === 'HIGH RISK').length,
    tourism_businesses: db.tourism_services.length,
    risk_hotspots: spots.filter((s) => s.level !== 'LOW RISK').length,
    covered_cities: db.locations.length,
    registered_users: db.users.length,
    assessments_run: db.risk_assessments.length,
    avg_trust: profiles.length ? Math.round(profiles.reduce((s, p) => s + p.trust_score, 0) / profiles.length) : 0,
    corpus: {
      reviews: db.reviews.length,
      complaints: db.complaints.length,
      incidents: db.incident_reports.length,
      benchmarks: db.price_benchmarks.length
    }
  });
});

route('GET', '/api/admin/ai', (ctx) => {
  requireRole(ctx, 'admin');
  bootPipeline();
  const db = getDb();
  return ok({
    model: modelInfo(),
    risk_config: db.risk_config,
    clusters: complaintClusters(8),
    recent_assessments: db.risk_assessments.slice(0, 8)
  });
});

route('PATCH', '/api/admin/config', (ctx) => {
  const admin = requireRole(ctx, 'admin');
  const db = getDb();
  const low = Number(ctx.body?.low_max ?? db.risk_config.low_max);
  const medium = Number(ctx.body?.medium_max ?? db.risk_config.medium_max);
  if (!(low > 0 && low < medium && medium < 100)) {
    throw new HttpError(422, 'Thresholds must satisfy 0 < low < medium < 100.');
  }
  db.risk_config = { ...db.risk_config, low_max: Math.round(low), medium_max: Math.round(medium) };
  persist();
  invalidateProfiles();
  audit(admin.id, 'config.update', 'risk_config', null, `thresholds → ${low}/${medium}`);
  return ok({ risk_config: db.risk_config });
});

route('GET', '/api/admin/audit', (ctx) => {
  requireRole(ctx, 'admin');
  const db = getDb();
  return ok({
    results: db.audit_logs.slice(0, 40).map((l) => ({
      ...l,
      actor: db.users.find((u) => u.id === l.actor_id)?.full_name ?? 'System'
    }))
  });
});

route('GET', '/api/meta/config', () => {
  const db = getDb();
  return ok({
    risk_config: db.risk_config,
    default_risk_config: DEFAULT_RISK_CONFIG,
    cities: db.locations.map((l) => ({ id: l.id, city: l.city, state: l.state, lat: l.lat, lng: l.lng })),
    service_types: SERVICE_TYPES,
    report_categories: REPORT_CATEGORIES,
    model: modelInfo()
  });
});

/* ------------------------------- dispatcher ---------------------------- */

export interface RequestOptions {
  body?: any;
  token?: string | null;
}

export async function request<T = any>(
method: string,
path: string,
options: RequestOptions = {})
: Promise<ApiResponse<T>> {
  // network-like latency so loading states are real
  await new Promise((r) => setTimeout(r, 220 + Math.random() * 220));

  const [pathname, search = ''] = path.split('?');
  const query = new URLSearchParams(search);

  let user: PublicUser | null = null;
  let jti: string | null = null;
  if (options.token) {
    const payload = verifyToken(options.token, SECRET);
    const db = getDb();
    if (payload && !db.revoked_tokens.includes(payload.jti)) {
      const record = db.users.find((u) => u.id === payload.sub);
      if (record) {
        user = userPublic(record);
        jti = payload.jti;
      }
    }
  }

  const match = routes.find((r) => r.method === method.toUpperCase() && r.pattern.test(pathname));
  if (!match) {
    return { status: 404, data: { message: `No route for ${method} ${pathname}` } as any };
  }
  const groups = match.pattern.exec(pathname)!.slice(1);
  const params: Record<string, string> = {};
  match.keys.forEach((k, i) => params[k] = decodeURIComponent(groups[i]));

  try {
    return match.handler({ body: options.body ?? {}, query, params, user, jti }) as ApiResponse<T>;
  } catch (err) {
    if (err instanceof HttpError) {
      return { status: err.status, data: { message: err.message, fields: err.detail } as any };
    }
    // never surface an internal trace to the interface
    console.error('[yatrashield] unhandled service error', err);
    return {
      status: 500,
      data: { message: 'Something went wrong while processing this request. Please try again.' } as any
    };
  }
}