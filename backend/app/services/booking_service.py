from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import utcnow
from app.models.booking import Booking
from app.models.charger import Charger
from app.models.user import User
from app.schemas.auth import AuthUser
from app.schemas.booking import BookingCreate, BookingRead, BookingStatus
from app.services import charging_service, vehicle_service


def create_booking(db: Session, payload: BookingCreate, user_id: str) -> BookingRead:
    charger = db.get(Charger, payload.charger_id)
    if charger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charger not found")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    vehicle = vehicle_service.get_primary_vehicle(db, user_id)
    energy_kwh = charging_service.estimated_energy_kwh(
        battery_capacity_kwh=vehicle.battery_capacity_kwh if vehicle else None,
        current_battery_pct=vehicle.current_battery_pct if vehicle else None,
        charger_power_kw=float(charger.power_kw),
    )
    price = charging_service.authoritative_session_price(
        payload.slot_time,
        charger.price_per_kwh,
        energy_kwh,
    )

    duration_minutes = max(1, round((energy_kwh / float(charger.power_kw)) * 60)) if charger.power_kw > 0 else 30

    booking = Booking(
        id=str(uuid4()),
        user_id=user_id,
        charger_id=payload.charger_id,
        slot_time=payload.slot_time,
        price=price,
        status=BookingStatus.BOOKED.value,
        duration_minutes=duration_minutes,
        created_at=utcnow(),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Reload with charger loaded
    from sqlalchemy.orm import joinedload
    booking = db.query(Booking).options(joinedload(Booking.charger)).filter(Booking.id == booking.id).first()
    return BookingRead.model_validate(booking)


def get_booking(db: Session, booking_id: str, current_user: AuthUser) -> BookingRead:
    from sqlalchemy.orm import joinedload
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.charger))
        .filter(Booking.id == booking_id)
        .first()
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return BookingRead.model_validate(booking)


def list_bookings(db: Session, user_id: str) -> list[BookingRead]:
    from sqlalchemy.orm import joinedload
    bookings = (
        db.query(Booking)
        .options(joinedload(Booking.charger))
        .filter(Booking.user_id == user_id)
        .all()
    )
    return [BookingRead.model_validate(b) for b in bookings]


def cancel_booking(db: Session, booking_id: str, current_user: AuthUser) -> BookingRead:
    from datetime import datetime, timezone, timedelta
    from sqlalchemy.orm import joinedload
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.charger))
        .filter(Booking.id == booking_id)
        .first()
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        
    resolved_status = booking.resolved_status
            
    if resolved_status == BookingStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking already cancelled")
    elif resolved_status == BookingStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel an active booking")
    elif resolved_status == BookingStatus.COMPLETED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a completed booking")
        
    now = datetime.now(timezone.utc)
    slot_time = booking.slot_time
    if slot_time.tzinfo is None:
        slot_time = slot_time.replace(tzinfo=timezone.utc)
    if now >= slot_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a booking after the charging window has started")

    booking.status = BookingStatus.CANCELLED.value
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return BookingRead.model_validate(booking)
