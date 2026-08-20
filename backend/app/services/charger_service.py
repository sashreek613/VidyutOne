from typing import Any

from fastapi import HTTPException, status

from app.schemas.charger import ChargerRead
from app.services.mock_store import load_chargers


def _to_charger_read(raw: dict[str, Any]) -> ChargerRead:
    return ChargerRead(
        id=str(raw["id"]),
        name=str(raw["name"]),
        latitude=float(raw["latitude"]),
        longitude=float(raw["longitude"]),
        power_kw=int(raw["power_kw"]),
        price_per_kwh=float(raw["price_per_kwh"]),
        availability=bool(raw["availability"]),
        connector_type=str(raw["connector_type"]),
        site_id=str(raw["site_id"]),
    )


def list_chargers() -> list[ChargerRead]:
    return [_to_charger_read(charger) for charger in load_chargers()]


def get_charger(charger_id: str) -> ChargerRead:
    for charger in load_chargers():
        if charger["id"] == charger_id:
            return _to_charger_read(charger)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charger not found")
