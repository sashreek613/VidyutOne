export type Recommendation = "BUILD" | "BUILD_IF_MANAGED" | "DONT_BUILD";

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
  price: number;
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

