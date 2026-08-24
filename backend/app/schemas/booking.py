from datetime import datetime, timezone, timedelta
from enum import Enum

from pydantic import BaseModel, ConfigDict

from app.schemas.charger import ChargerRead
from app.models.booking import Booking


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
    duration_minutes: int
    charger: ChargerRead | None = None

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if isinstance(obj, Booking):
            charger_val = None
            if obj.charger:
                charger_val = ChargerRead.model_validate(obj.charger)
                
            return cls(
                id=obj.id,
                user_id=obj.user_id,
                charger_id=obj.charger_id,
                slot_time=obj.slot_time,
                price=obj.price,
                status=obj.resolved_status,
                created_at=obj.created_at,
                duration_minutes=getattr(obj, "duration_minutes", 30) or 30,
                charger=charger_val,
            )
        return super().model_validate(obj, **kwargs)
