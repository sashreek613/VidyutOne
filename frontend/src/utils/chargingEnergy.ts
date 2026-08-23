/** Quantity helper matching backend charging_service.estimated_energy_kwh.
 *  This is not a tariff formula — ₹/kWh always comes from the pricing API.
 */
export const TARGET_SOC_PCT = 80;
export const MIN_TOPUP_FRACTION = 0.05;

export function estimatedEnergyKwh(input: {
  batteryCapacityKwh?: number | null;
  currentBatteryPct?: number | null;
  chargerPowerKw: number;
}): number {
  const { batteryCapacityKwh, currentBatteryPct, chargerPowerKw } = input;
  if (batteryCapacityKwh && batteryCapacityKwh > 0 && currentBatteryPct != null) {
    const delta = Math.max(TARGET_SOC_PCT - currentBatteryPct, 0);
    let energy = batteryCapacityKwh * (delta / 100);
    if (energy < 0.5) {
      energy = Math.max(batteryCapacityKwh * MIN_TOPUP_FRACTION, 0.1);
    }
    return Math.round(energy * 100) / 100;
  }
  return Math.round(Math.min(chargerPowerKw * 0.5, 40) * 100) / 100;
}

export function nextUtcHour(hour: number, from: Date = new Date()): Date {
  const next = new Date(from.getTime());
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(hour);
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export function sessionTotal(energyKwh: number, tariffPerKwh: number): number {
  return Math.round(energyKwh * tariffPerKwh * 100) / 100;
}
