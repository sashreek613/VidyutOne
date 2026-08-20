"""Placeholder intelligence layer. Replace with ML / optimization later."""

from app.schemas import Recommendation

DEMAND_WEIGHT = 0.40
GRID_WEIGHT = 0.35
ACCESSIBILITY_WEIGHT = 0.15
CHARGER_GAP_WEIGHT = 0.10


def compute_site_score(
    demand_score: float,
    grid_capacity_score: float,
    accessibility_score: float,
    charger_gap_score: float,
) -> float:
    score = (
        DEMAND_WEIGHT * demand_score
        + GRID_WEIGHT * grid_capacity_score
        + ACCESSIBILITY_WEIGHT * accessibility_score
        + CHARGER_GAP_WEIGHT * charger_gap_score
    )
    return round(score, 2)


def recommend_site(demand_score: float, grid_capacity_score: float) -> Recommendation:
    if demand_score >= 70 and grid_capacity_score >= 70:
        return Recommendation.BUILD
    if demand_score >= 70 and grid_capacity_score >= 40:
        return Recommendation.BUILD_IF_MANAGED
    return Recommendation.DONT_BUILD
