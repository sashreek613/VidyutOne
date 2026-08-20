from pydantic import BaseModel, ConfigDict


class ChargerBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    power_kw: int
    price_per_kwh: float
    availability: bool
    connector_type: str
    site_id: str


class ChargerRead(ChargerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
