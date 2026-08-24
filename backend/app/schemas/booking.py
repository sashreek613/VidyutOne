from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class BookingStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BookingCreate(BaseModel):
    charger_id: str
    slot_time: datetime
    price: float | None = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    charger_id: str
    slot_time: datetime
    price: float
    status: BookingStatus
    created_at: datetime
