import axios from "axios";

import { supabase } from "../lib/supabase";
import type { Booking, BookingCreate, Charger, ClassifiedSite, HealthStatus, LocationSuggestion, PricingTier, Profile, RecommendedSite, Site, Vehicle, VehicleCreate, VehicleUpdate } from "../types";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error("VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env.");
}

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

client.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await client.get<HealthStatus>("/api/health");
  return data;
}

export async function getMe(accessToken?: string): Promise<Profile> {
  const { data } = await client.get<Profile>("/api/me", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return data;
}

export async function getSites(): Promise<Site[]> {
  const { data } = await client.get<Site[]>("/api/sites");
  return data;
}

export async function getSite(id: string): Promise<Site> {
  const { data } = await client.get<Site>(`/api/sites/${id}`);
  return data;
}

export async function getRecommendedSites(limit: number = 10): Promise<RecommendedSite[]> {
  const { data } = await client.get<RecommendedSite[]>("/api/sites/recommended", { params: { limit } });
  return data;
}

export async function classifyByCoords(lat: number, lon: number): Promise<ClassifiedSite> {
  const { data } = await client.get<ClassifiedSite>("/api/sites/classify", { params: { lat, lon } });
  return data;
}

export async function classifyByName(q: string): Promise<ClassifiedSite> {
  const { data } = await client.get<ClassifiedSite>("/api/sites/classify", { params: { q } });
  return data;
}

export async function suggestLocations(q: string, limit: number = 8): Promise<LocationSuggestion[]> {
  const { data } = await client.get<LocationSuggestion[]>("/api/sites/suggest", { params: { q, limit } });
  return data;
}

export async function getChargers(): Promise<Charger[]> {
  const { data } = await client.get<Charger[]>("/api/chargers");
  return data;
}

export async function getCharger(id: string): Promise<Charger> {
  const { data } = await client.get<Charger>(`/api/chargers/${id}`);
  return data;
}

export async function createBooking(payload: BookingCreate): Promise<Booking> {
  const { data } = await client.post<Booking>("/api/bookings", payload);
  return data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await client.get<Booking>(`/api/bookings/${id}`);
  return data;
}

export async function getVehicles(): Promise<Vehicle[]> {
  const { data } = await client.get<Vehicle[]>("/api/vehicles");
  return data;
}

export async function createVehicle(payload: VehicleCreate): Promise<Vehicle> {
  const { data } = await client.post<Vehicle>("/api/vehicles", payload);
  return data;
}

export async function updateVehicle(id: string, payload: VehicleUpdate): Promise<Vehicle> {
  const { data } = await client.patch<Vehicle>(`/api/vehicles/${id}`, payload);
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await client.delete(`/api/vehicles/${id}`);
}

export async function getSlotPrice(slotIso: string, basePrice: number = 120.0): Promise<PricingTier> {
  const { data } = await client.get<PricingTier>("/api/pricing/calculate", {
    params: { slot_time: slotIso, base_price: basePrice },
  });
  return data;
}

