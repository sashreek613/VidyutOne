import pytest
from datetime import datetime, timezone, timedelta
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_current_user
from app.database.session import SessionLocal
from app.models.site import Site
from app.models.charger import Charger
from app.models.user import User, ROLE_DRIVER
from app.models.booking import Booking
from app.schemas.auth import AuthUser
from app.schemas.booking import BookingStatus

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def seed_test_data():
    db = SessionLocal()
    
    driver1 = User(
        id="driver-1",
        full_name="Driver One",
        email="driver1@example.com",
        role=ROLE_DRIVER,
    )
    driver2 = User(
        id="driver-2",
        full_name="Driver Two",
        email="driver2@example.com",
        role=ROLE_DRIVER,
    )
    db.merge(driver1)
    db.merge(driver2)
    
    site = Site(
        id="site-test",
        name="Test Site",
        latitude=12.9716,
        longitude=77.5946,
        demand_score=80.0,
        grid_capacity_score=80.0,
        accessibility_score=80.0,
        charger_gap_score=80.0,
    )
    db.merge(site)
    
    charger = Charger(
        id="charger-test",
        name="Test Charger",
        latitude=12.9716,
        longitude=77.5946,
        power_kw=22,
        price_per_kwh=15.0,
        availability=True,
        connector_type="CCS2",
        site_id="site-test",
    )
    db.merge(charger)
    db.commit()
    db.close()
    yield


def test_driver_can_create_and_retrieve_booking():
    user1 = AuthUser(id="driver-1", email="driver1@example.com", full_name="Driver One", role=ROLE_DRIVER)
    app.dependency_overrides[get_current_user] = lambda: user1
    
    try:
        slot_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        response = client.post(
            "/api/bookings",
            json={
                "charger_id": "charger-test",
                "slot_time": slot_time,
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == "driver-1"
        assert data["charger_id"] == "charger-test"
        assert data["status"] == "BOOKED"
        assert data["duration_minutes"] > 0
        booking_id = data["id"]
        
        get_res = client.get(f"/api/bookings/{booking_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == booking_id
        
        list_res = client.get("/api/bookings")
        assert list_res.status_code == 200
        bookings_list = list_res.json()
        assert len(bookings_list) >= 1
        assert any(b["id"] == booking_id for b in bookings_list)
        
        user2 = AuthUser(id="driver-2", email="driver2@example.com", full_name="Driver Two", role=ROLE_DRIVER)
        app.dependency_overrides[get_current_user] = lambda: user2
        get_other = client.get(f"/api/bookings/{booking_id}")
        assert get_other.status_code == 403
        
    finally:
        app.dependency_overrides.clear()


def test_driver_cancellation_rules():
    user1 = AuthUser(id="driver-1", email="driver1@example.com", full_name="Driver One", role=ROLE_DRIVER)
    user2 = AuthUser(id="driver-2", email="driver2@example.com", full_name="Driver Two", role=ROLE_DRIVER)
    
    db = SessionLocal()
    b_booked = Booking(
        id="b-booked",
        user_id="driver-1",
        charger_id="charger-test",
        slot_time=datetime.now(timezone.utc) + timedelta(hours=1),
        price=100.0,
        status=BookingStatus.BOOKED.value,
        duration_minutes=30,
    )
    b_active = Booking(
        id="b-active",
        user_id="driver-1",
        charger_id="charger-test",
        slot_time=datetime.now(timezone.utc) - timedelta(minutes=15),
        price=100.0,
        status=BookingStatus.BOOKED.value,
        duration_minutes=30,
    )
    b_completed = Booking(
        id="b-completed",
        user_id="driver-1",
        charger_id="charger-test",
        slot_time=datetime.now(timezone.utc) - timedelta(hours=2),
        price=100.0,
        status=BookingStatus.BOOKED.value,
        duration_minutes=30,
    )
    b_cancelled = Booking(
        id="b-cancelled",
        user_id="driver-1",
        charger_id="charger-test",
        slot_time=datetime.now(timezone.utc) + timedelta(hours=5),
        price=100.0,
        status=BookingStatus.CANCELLED.value,
        duration_minutes=30,
    )
    
    db.merge(b_booked)
    db.merge(b_active)
    db.merge(b_completed)
    db.merge(b_cancelled)
    db.commit()
    db.close()
    
    try:
        app.dependency_overrides[get_current_user] = lambda: user2
        res = client.patch("/api/bookings/b-booked/cancel")
        assert res.status_code == 403
        
        app.dependency_overrides[get_current_user] = lambda: user1
        res = client.patch("/api/bookings/b-booked/cancel")
        assert res.status_code == 200
        assert res.json()["status"] == "CANCELLED"
        
        res = client.patch("/api/bookings/b-active/cancel")
        assert res.status_code == 400
        
        res = client.patch("/api/bookings/b-completed/cancel")
        assert res.status_code == 400
        
        res = client.patch("/api/bookings/b-cancelled/cancel")
        assert res.status_code == 400
        
    finally:
        app.dependency_overrides.clear()
