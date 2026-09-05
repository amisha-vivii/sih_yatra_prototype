export type Role = 'tourist' | 'admin';

export type ServiceType =
'Hotel' |
'Travel Agency' |
'Tour Operator' |
'Guide' |
'Taxi / Local Transport' |
'Activity / Local Service';

export const SERVICE_TYPES: ServiceType[] = [
'Hotel',
'Travel Agency',
'Tour Operator',
'Guide',
'Taxi / Local Transport',
'Activity / Local Service'];


export type RiskLevel = 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';

export type ReportStatus = 'Pending' | 'Under Review' | 'Resolved' | 'Rejected';

export const REPORT_STATUSES: ReportStatus[] = ['Pending', 'Under Review', 'Resolved', 'Rejected'];

export type ReportCategory =
'Overcharging' |
'Fake/Misleading Review' |
'Poor Service' |
'Suspicious Service' |
'Hidden Charges' |
'Other';

export const REPORT_CATEGORIES: ReportCategory[] = [
'Overcharging',
'Fake/Misleading Review',
'Poor Service',
'Suspicious Service',
'Hidden Charges',
'Other'];


/* ------------------------------- records ------------------------------- */

export interface UserRecord {
  id: number;
  email: string;
  full_name: string;
  role_id: number;
  password_hash: string;
  password_salt: string;
  created_at: string;
  home_city: string;
  phone: string;
}

export interface RoleRecord {
  id: number;
  name: Role;
  description: string;
}

export interface PublicUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  home_city: string;
  phone: string;
  created_at: string;
}

export interface LocationRecord {
  id: number;
  city: string;
  state: string;
  /** PostGIS geography(Point, 4326) in the SQL schema */
  lat: number;
  lng: number;
  /** 0-1 aggregate location signal derived from seeded incident history */
  location_risk_index: number;
  peak_months: number[];
}

export interface ServiceRecord {
  id: number;
  name: string;
  service_type: ServiceType;
  location_id: number;
  lat: number;
  lng: number;
  address: string;
  registered: boolean;
  years_active: number;
  created_at: string;
}

export interface PriceBenchmarkRecord {
  id: number;
  location_id: number;
  service_type: ServiceType;
  benchmark_price: number;
  p90_price: number;
  currency: 'INR';
  unit: string;
}

export interface ReviewRecord {
  id: number;
  service_id: number;
  rating: number;
  text: string;
  author_handle: string;
  created_at: string;
}

export interface ComplaintRecord {
  id: number;
  service_id: number;
  category: ReportCategory;
  text: string;
  created_at: string;
}

export interface IncidentRecord {
  id: number;
  service_id: number | null;
  location_id: number;
  severity: 1 | 2 | 3;
  summary: string;
  created_at: string;
}

export interface ServiceReportRecord {
  id: number;
  user_id: number;
  service_id: number | null;
  service_name: string;
  location_id: number | null;
  city: string;
  category: ReportCategory;
  description: string;
  paid_price: number | null;
  incident_date: string;
  evidence_name: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  admin_note: string | null;
  /** cached semantic-cluster label from the embedding model */
  cluster_label: string | null;
}

export interface SignalContribution {
  key: string;
  label: string;
  points: number;
  detail: string;
  source: 'model' | 'rule';
}

export interface RiskAssessmentRecord {
  id: number;
  user_id: number;
  service_id: number | null;
  service_name: string;
  service_type: ServiceType;
  city: string;
  lat: number;
  lng: number;
  quoted_price: number;
  benchmark_price: number;
  price_deviation_pct: number;
  risk_score: number;
  risk_level: RiskLevel;
  trust_score: number;
  trust_label: string;
  anomaly_score: number;
  complaint_similarity: number;
  similar_complaints: {text: string;similarity: number;created_at: string;}[];
  review_similarity: number;
  contributions: SignalContribution[];
  trust_signals: string[];
  alternatives: {
    service_id: number;
    name: string;
    service_type: ServiceType;
    trust_score: number;
    risk_score: number;
    benchmark_price: number;
    distance_km: number;
  }[];
  features: Record<string, number>;
  created_at: string;
}

export interface SavedServiceRecord {
  id: number;
  user_id: number;
  service_id: number;
  created_at: string;
}

export interface AuditLogRecord {
  id: number;
  actor_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string;
  created_at: string;
}

export interface RiskConfig {
  low_max: number;
  medium_max: number;
  weights: {
    price_anomaly: number;
    complaint_similarity: number;
    complaint_frequency: number;
    incident_signal: number;
    review_pattern: number;
    location_context: number;
    service_type: number;
  };
}