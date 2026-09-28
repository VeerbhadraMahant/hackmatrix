"""Phase-0 smoke tests -- confirm the app boots and the stub contract holds.
Real behavioural tests live alongside each module (analytics/, forecast/,
simulate/, copilot/) added by the background agents.
"""
from fastapi.testclient import TestClient

from app.core.db import init_db
from app.main import app

# Ensure tables exist even if this module's TestClient never triggers
# FastAPI's lifespan (plain `TestClient(app)` without `with` doesn't run
# startup events) -- needed now that /api/dashboard queries the DB for real
# instead of only ever returning a static fixture. init_db() is idempotent.
init_db()
client = TestClient(app)


def test_health() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_dashboard_shape() -> None:
    r = client.get("/api/dashboard/demo-priya")
    assert r.status_code == 200
    body = r.json()
    for key in ("health_score", "forecast", "insights", "recurring_obligations", "debts"):
        assert key in body
    assert 0 <= body["health_score"]["overall"] <= 100


def test_chat_rejects_empty_message() -> None:
    r = client.post("/api/chat", json={"message": ""})
    assert r.status_code == 400


def test_chat_stub_returns_answer_contract() -> None:
    r = client.post("/api/chat", json={"message": "How am I doing?"})
    assert r.status_code == 200
    body = r.json()
    assert "facts" in body and "predictions" in body and "recommendations" in body
