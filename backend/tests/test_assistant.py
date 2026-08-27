"""Tests for POST /api/assistant/chat (backend/app/services/lyzr_service.py).

Same TestClient(app) + monkeypatch pattern as tests/test_charger_service.py:
site_service.list_recommended_sites is monkeypatched so these never touch a
live DB connection, and requests.post is monkeypatched so these never make a
real network call to Lyzr -- both the DB and the assistant's own live call
are the two things this endpoint would otherwise depend on at request time.
"""

from __future__ import annotations

import requests
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.schemas.site import Recommendation, RecommendedSiteRead
from app.services import lyzr_service, site_service


def _fake_recommended_sites(db=None, limit: int = 10) -> list[RecommendedSiteRead]:
    return [
        RecommendedSiteRead(
            rank=1,
            id="site-1",
            name="Test Metro Station",
            latitude=12.97,
            longitude=77.59,
            demand_score=90.0,
            grid_capacity_score=80.0,
            accessibility_score=70.0,
            charger_gap_score=60.0,
            site_score=85.0,
            recommendation=Recommendation.BUILD,
            factors=[],
            explanation="Demand and grid readiness both clear the bar.",
        )
    ]


class _FakeLyzrResponse:
    def __init__(self, status_code: int = 200, json_body: dict | None = None):
        self.status_code = status_code
        self._json_body = json_body if json_body is not None else {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"status {self.status_code}")

    def json(self) -> dict:
        return self._json_body


def _configure_lyzr(monkeypatch: pytest.MonkeyPatch, *, api_key: str, agent_id: str) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "LYZR_API_KEY", api_key)
    monkeypatch.setattr(settings, "LYZR_AGENT_ID", agent_id)


def test_assistant_chat_returns_reply_on_success(monkeypatch: pytest.MonkeyPatch):
    _configure_lyzr(monkeypatch, api_key="test-key", agent_id="test-agent")
    monkeypatch.setattr(site_service, "list_recommended_sites", _fake_recommended_sites)

    def fake_post(url, headers=None, json=None, timeout=None):
        assert url == lyzr_service.LYZR_CHAT_URL
        assert headers["x-api-key"] == "test-key"
        assert json["agent_id"] == "test-agent"
        assert json["session_id"] == "session-abc"
        assert "Test Metro Station" in json["system_prompt_variables"]["site_context"]
        return _FakeLyzrResponse(200, {"response": "The top site is Test Metro Station."})

    monkeypatch.setattr(lyzr_service.requests, "post", fake_post)

    client = TestClient(app)
    response = client.post("/api/assistant/chat", json={"message": "Which site is #1?", "session_id": "session-abc"})

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "The top site is Test Metro Station."
    assert body["session_id"] == "session-abc"


def test_assistant_chat_returns_graceful_fallback_on_timeout(monkeypatch: pytest.MonkeyPatch):
    _configure_lyzr(monkeypatch, api_key="test-key", agent_id="test-agent")
    monkeypatch.setattr(site_service, "list_recommended_sites", _fake_recommended_sites)

    def fake_post_timeout(url, headers=None, json=None, timeout=None):
        raise requests.Timeout("simulated timeout")

    monkeypatch.setattr(lyzr_service.requests, "post", fake_post_timeout)

    client = TestClient(app)
    response = client.post("/api/assistant/chat", json={"message": "hi", "session_id": "session-xyz"})

    assert response.status_code == 200  # never a 500 to the frontend
    assert response.json()["reply"] == lyzr_service.UNAVAILABLE_MESSAGE


def test_assistant_chat_returns_graceful_fallback_on_non_200(monkeypatch: pytest.MonkeyPatch):
    _configure_lyzr(monkeypatch, api_key="test-key", agent_id="test-agent")
    monkeypatch.setattr(site_service, "list_recommended_sites", _fake_recommended_sites)
    monkeypatch.setattr(lyzr_service.requests, "post", lambda *a, **k: _FakeLyzrResponse(500, {}))

    client = TestClient(app)
    response = client.post("/api/assistant/chat", json={"message": "hi", "session_id": "session-500"})

    assert response.status_code == 200
    assert response.json()["reply"] == lyzr_service.UNAVAILABLE_MESSAGE


def test_assistant_chat_returns_graceful_fallback_on_malformed_response(monkeypatch: pytest.MonkeyPatch):
    _configure_lyzr(monkeypatch, api_key="test-key", agent_id="test-agent")
    monkeypatch.setattr(site_service, "list_recommended_sites", _fake_recommended_sites)
    # 200 OK but missing the "response" field entirely.
    monkeypatch.setattr(lyzr_service.requests, "post", lambda *a, **k: _FakeLyzrResponse(200, {"unexpected": "shape"}))

    client = TestClient(app)
    response = client.post("/api/assistant/chat", json={"message": "hi", "session_id": "session-malformed"})

    assert response.status_code == 200
    assert response.json()["reply"] == lyzr_service.UNAVAILABLE_MESSAGE


def test_assistant_chat_not_configured_short_circuits_without_network_call(monkeypatch: pytest.MonkeyPatch):
    _configure_lyzr(monkeypatch, api_key="", agent_id="")

    def fail_if_called(*args, **kwargs):
        raise AssertionError("requests.post must not be called when Lyzr isn't configured")

    monkeypatch.setattr(lyzr_service.requests, "post", fail_if_called)

    client = TestClient(app)
    response = client.post("/api/assistant/chat", json={"message": "hi", "session_id": "session-none"})

    assert response.status_code == 200
    assert response.json()["reply"] == lyzr_service.NOT_CONFIGURED_MESSAGE
