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
  user_id: string;
  charger_id: string;
  slot_time: string;
  price: number;
}

export interface HealthStatus {
  status: string;
  service: string;
}
