import axios from "axios";

import { supabase } from "../lib/supabase";
import type { Booking, BookingCreate, Charger, HealthStatus, Profile, Site } from "../types";

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
