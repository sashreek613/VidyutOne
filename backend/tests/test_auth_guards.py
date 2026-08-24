from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app
from app.models.user import ROLE_DRIVER, ROLE_PLANNER
from app.schemas.auth import AuthUser

client = TestClient(app)


def test_health_remains_public() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_health_is_public() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "VidyutOne backend"}


def test_me_without_jwt_is_401() -> None:
    response = client.get("/api/me")
    assert response.status_code == 401


def test_booking_without_jwt_is_401() -> None:
    response = client.post(
        "/api/bookings",
        json={
            "charger_id": "chg-koramangala-01",
            "slot_time": "2026-08-20T10:30:00+00:00",
            "price": 18.5,
        },
    )
    assert response.status_code == 401


def test_planner_cannot_call_driver_endpoint() -> None:
    planner = AuthUser(
        id="user-planner-test",
        email="planner@example.com",
        full_name="Planner Test",
        role=ROLE_PLANNER,
    )
    app.dependency_overrides[get_current_user] = lambda: planner
    try:
        response = client.get("/api/me/driver")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_driver_cannot_call_planner_endpoint() -> None:
    driver = AuthUser(
        id="user-driver-test",
        email="driver@example.com",
        full_name="Driver Test",
        role=ROLE_DRIVER,
    )
    app.dependency_overrides[get_current_user] = lambda: driver
    try:
        response = client.get("/api/me/planner")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_charging_summary_without_jwt_is_401() -> None:
    response = client.get("/api/driver/charging-summary")
    assert response.status_code == 401


def test_charging_quote_without_jwt_is_401() -> None:
    response = client.post(
        "/api/driver/charging-quote",
        json={
            "charger_id": "chg-koramangala-01",
            "slots": ["2026-08-20T23:00:00+00:00"],
        },
    )
    assert response.status_code == 401


def test_planner_cannot_read_driver_charging_summary() -> None:
    planner = AuthUser(
        id="user-planner-test",
        email="planner@example.com",
        full_name="Planner Test",
        role=ROLE_PLANNER,
    )
    app.dependency_overrides[get_current_user] = lambda: planner
    try:
        response = client.get("/api/driver/charging-summary")
        assert response.status_code == 403
        history = client.get("/api/driver/charging-history")
        assert history.status_code == 403
        quote = client.post(
            "/api/driver/charging-quote",
            json={
                "charger_id": "chg-koramangala-01",
                "slots": ["2026-08-20T23:00:00+00:00"],
            },
        )
        assert quote.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_driver_charging_summary_returns_only_own_empty_history() -> None:
    driver = AuthUser(
        id="user-driver-charging-test-no-rows",
        email="driver.charging@example.com",
        full_name="Charging Test",
        role=ROLE_DRIVER,
    )
    app.dependency_overrides[get_current_user] = lambda: driver
    try:
        response = client.get("/api/driver/charging-summary")
        assert response.status_code == 200
        body = response.json()
        assert body["history"] == []
        assert body["month"]["sessions"] == 0
        assert body["last_session"] is None
        assert body["insight"] is None
        assert body["total_energy_kwh"] is None
        history = client.get("/api/driver/charging-history")
        assert history.status_code == 200
        assert history.json() == []
    finally:
        app.dependency_overrides.clear()


def test_valid_user_can_read_me_shape() -> None:
    user = AuthUser(
        id="user-driver-demo",
        email="driver.demo@vidyutone.local",
        full_name="Nikhil",
        role=ROLE_DRIVER,
    )
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.get("/api/me")
        # 200 if the demo user exists in the connected DB; 404 if seed has not run.
        assert response.status_code in {200, 404}
        if response.status_code == 200:
            body = response.json()
            assert body["role"] == ROLE_DRIVER
            assert "created_at" in body
    finally:
        app.dependency_overrides.clear()


def test_auth_user_role_helpers() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    assert now_iso
    planner = AuthUser(id="1", email="a@b.c", full_name="A", role=ROLE_PLANNER)
    driver = AuthUser(id="2", email="d@e.f", full_name="D", role=ROLE_DRIVER)
    assert planner.is_planner
    assert driver.is_driver
    assert not planner.is_driver
    assert not driver.is_planner
