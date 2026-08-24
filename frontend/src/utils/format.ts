export function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatKwh(value: number): string {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kWh`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatCoord(value: number, axis: "N" | "E"): string {
  return `${value.toFixed(4)}° ${axis}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function firstNameFromFullName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const first = parts[0]![0] ?? "";
  const last = parts[1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}
