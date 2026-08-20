from typing import Any

from fastapi import HTTPException, status

from app.engines.recommendation import compute_site_score, recommend_site
from app.schemas.site import SiteRead
from app.services.mock_store import load_sites


def _to_site_read(raw: dict[str, Any]) -> SiteRead:
    demand = float(raw["demand_score"])
    grid = float(raw["grid_capacity_score"])
    accessibility = float(raw["accessibility_score"])
    charger_gap = float(raw["charger_gap_score"])
    return SiteRead(
        id=str(raw["id"]),
        name=str(raw["name"]),
        latitude=float(raw["latitude"]),
        longitude=float(raw["longitude"]),
        demand_score=demand,
        grid_capacity_score=grid,
        accessibility_score=accessibility,
        charger_gap_score=charger_gap,
        site_score=compute_site_score(demand, grid, accessibility, charger_gap),
        recommendation=recommend_site(demand, grid),
    )


def list_sites() -> list[SiteRead]:
    return [_to_site_read(site) for site in load_sites()]


def get_site(site_id: str) -> SiteRead:
    for site in load_sites():
        if site["id"] == site_id:
            return _to_site_read(site)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
