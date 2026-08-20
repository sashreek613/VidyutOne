from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, status

from app.schemas.booking import BookingCreate, BookingRead, BookingStatus
from app.services.charger_service import get_charger

_bookings: list[BookingRead] = []


def create_booking(payload: BookingCreate) -> BookingRead:
    get_charger(payload.charger_id)
    booking = BookingRead(
        id=str(uuid4()),
        user_id=payload.user_id,
        charger_id=payload.charger_id,
        slot_time=payload.slot_time,
        price=payload.price,
        status=BookingStatus.BOOKED,
        created_at=datetime.now(UTC),
    )
    _bookings.append(booking)
    return booking


def get_booking(booking_id: str) -> BookingRead:
    for booking in _bookings:
        if booking.id == booking_id:
            return booking
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
