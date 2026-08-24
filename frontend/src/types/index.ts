export type Recommendation = "BUILD" | "BUILD_IF_MANAGED" | "DONT_BUILD";

// How much to trust a sub-score. REAL/DERIVED/ESTIMATED are the honesty
// tiers the scoring engine is built on (see backend/app/engines/site_scoring.py);
// DEMO flags a value that's placeholder data, not a real source yet (e.g.
// coverage_gap before OpenChargeMap is wired in).
export type Provenance = "REAL" | "DERIVED" | "ESTIMATED" | "DEMO";

export interface ScoredFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  provenance: Provenance;
  detail: string;
}

export type BookingStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type UserRole = "planner" | "driver";

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demand_score: number;
  grid_capacity_score: number;
  accessibility_score: number;
  charger_gap_score: number;
  site_score: number;
  recommendation: Recommendation;
  // Optional so pages/components compiled against the old API shape keep
  // working -- present once the backend scoring engine (Phase B) is live.
  factors?: ScoredFactor[];
  explanation?: string;
}

export interface RecommendedSite extends Site {
  rank: number;
}

export interface NearestCandidate {
  id: string;
  name: string;
  site_score: number;
  recommendation: Recommendation;
  distance_km: number;
}

// GET /api/sites/classify -- an arbitrary lat/lon or name-resolved point,
// scored by the same engine as Site/RecommendedSite. Deliberately has no
// `id`: this point may not correspond to any seeded candidate.
export interface ClassifiedSite {
  name: string;
  latitude: number;
  longitude: number;
  demand_score: number;
  grid_capacity_score: number;
  accessibility_score: number;
  charger_gap_score: number;
  site_score: number;
  recommendation: Recommendation;
  factors: ScoredFactor[];
  explanation: string;
  in_bbox: boolean;
  nearest_candidate: NearestCandidate | null;
}

// GET /api/sites/suggest -- offline name-index autocomplete result.
export interface LocationSuggestion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: "candidate_site" | "locality";
}

export interface Charger {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  power_kw: number;
  price_per_kwh: number;
  availability: boolean;
  connector_type: string;
  site_id: string;
}

export interface Booking {
  id: string;
  user_id: string;
  charger_id: string;
  slot_time: string;
  price: number;
  status: BookingStatus;
  created_at: string;
}

export interface BookingCreate {
  charger_id: string;
  slot_time: string;
  price?: number;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct: number;
  efficiency_wh_km: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct?: number;
  efficiency_wh_km?: number;
  is_primary?: boolean;
}

export interface VehicleUpdate {
  make?: string;
  model?: string;
  battery_capacity_kwh?: number;
  current_battery_pct?: number;
  efficiency_wh_km?: number;
  is_primary?: boolean;
}

export interface RangeEstimate {
  battery_capacity_kwh: number;
  current_battery_pct: number;
  available_kwh: number;
  efficiency_wh_km: number;
  estimated_range_km: number;
}

export interface PricingTier {
  slot_iso: string;
  price: number;
  is_peak: boolean;
  is_off_peak: boolean;
  savings_amount: number;
  description: string;
}

export interface HealthStatus {
  status: string;
  service: string;
}

export interface ChargingSession {
  booking_id: string;
  charger_id: string;
  station_name: string;
  slot_time: string;
  window_label: string;
  is_peak: boolean;
  is_off_peak: boolean;
  energy_kwh: number | null;
  cost: number;
  savings: number | null;
  status: BookingStatus;
}

export interface MonthlyChargingSummary {
  sessions: number;
  cost: number | null;
  savings: number | null;
  energy_kwh: number | null;
  avg_cost_per_session: number | null;
  avg_cost_per_kwh: number | null;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  cost: number;
  energy_kwh: number | null;
}

export interface ChargingInsight {
  kind: "saved" | "could_save";
  amount: number;
  text: string;
}

export interface ChargingSummary {
  history: ChargingSession[];
  month: MonthlyChargingSummary;
  trend: MonthlyTrendPoint[];
  last_session: ChargingSession | null;
  insight: ChargingInsight | null;
  total_energy_kwh: number | null;
}

export interface ChargingSlotQuote {
  slot_time: string;
  tariff_per_kwh: number;
  total: number;
  is_peak: boolean;
  is_off_peak: boolean;
  savings_amount: number;
  description: string;
  window_label: string;
}

export interface ChargingQuote {
  energy_kwh: number;
  quotes: ChargingSlotQuote[];
}

