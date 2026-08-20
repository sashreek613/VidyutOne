export function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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
