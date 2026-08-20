from fastapi import APIRouter, status

from app.schemas.booking import BookingCreate, BookingRead
from app.services import booking_service

router = APIRouter()


@router.post("/bookings", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate) -> BookingRead:
    return booking_service.create_booking(payload)


@router.get("/bookings/{booking_id}", response_model=BookingRead)
def get_booking(booking_id: str) -> BookingRead:
    return booking_service.get_booking(booking_id)
