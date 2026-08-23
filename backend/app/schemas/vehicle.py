from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VehicleCreate(BaseModel):
    make: str = Field(..., example="Tata")
    model: str = Field(..., example="Nexon EV")
    battery_capacity_kwh: float = Field(..., gt=0, example=40.5)
    current_battery_pct: float = Field(default=50.0, ge=0, le=100, example=42.0)
    efficiency_wh_km: float = Field(default=150.0, gt=0, example=145.0)
    is_primary: bool = Field(default=True)


class VehicleUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    battery_capacity_kwh: float | None = Field(default=None, gt=0)
    current_battery_pct: float | None = Field(default=None, ge=0, le=100)
    efficiency_wh_km: float | None = Field(default=None, gt=0)
    is_primary: bool | None = None


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    make: str
    model: str
    battery_capacity_kwh: float
    current_battery_pct: float
    efficiency_wh_km: float
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class RangeEstimate(BaseModel):
    battery_capacity_kwh: float
    current_battery_pct: float
    available_kwh: float
    efficiency_wh_km: float
    estimated_range_km: float
