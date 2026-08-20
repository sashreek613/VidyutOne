from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Recommendation(str, Enum):
    BUILD = "BUILD"
    BUILD_IF_MANAGED = "BUILD_IF_MANAGED"
    DONT_BUILD = "DONT_BUILD"


class SiteBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    demand_score: float = Field(ge=0, le=100)
    grid_capacity_score: float = Field(ge=0, le=100)
    accessibility_score: float = Field(ge=0, le=100)
    charger_gap_score: float = Field(ge=0, le=100)


class SiteRead(SiteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    site_score: float
    recommendation: Recommendation
