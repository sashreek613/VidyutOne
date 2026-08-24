export type Recommendation = "BUILD" | "BUILD_IF_MANAGED" | "DONT_BUILD";

export type BookingStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type UserRole = "planner" | "driver" | "admin";

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
  organization?: string | null;
  phone_number?: string | null;
  designation?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
  verification_status?: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
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

