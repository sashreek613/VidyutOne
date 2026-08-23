"""Range estimation service.

Calculates available energy (kWh) and estimated usable range (km)
from vehicle battery capacity, current battery percentage, and Wh/km efficiency.
"""

from app.schemas.vehicle import RangeEstimate


def calculate_range(
    battery_capacity_kwh: float,
    current_battery_pct: float,
    efficiency_wh_km: float = 150.0,
) -> RangeEstimate:
    pct = max(0.0, min(100.0, current_battery_pct))
    available_kwh = round((battery_capacity_kwh * pct) / 100.0, 2)
    # Wh/km -> kWh/km = efficiency_wh_km / 1000.0
    kwh_per_km = efficiency_wh_km / 1000.0 if efficiency_wh_km > 0 else 0.15
    estimated_range_km = round(available_kwh / kwh_per_km, 1)

    return RangeEstimate(
        battery_capacity_kwh=battery_capacity_kwh,
        current_battery_pct=pct,
        available_kwh=available_kwh,
        efficiency_wh_km=efficiency_wh_km,
        estimated_range_km=estimated_range_km,
    )
