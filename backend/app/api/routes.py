"""API routes. Phase-0 stubs return fixture data so the frontend can build
against a stable contract immediately; each background agent replaces the
relevant stub with real logic (see comments) without changing response
shapes (those are fixed in app.schemas).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.ingest.fixtures import demo_dashboard_snapshot
from app.schemas import (
    AnswerContract,
    ChatRequest,
    DashboardSnapshot,
    Fact,
    RecomputeDiff,
    SimulationRequest,
    SimulationResult,
)

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@router.get("/dashboard/{user_id}", response_model=DashboardSnapshot)
def get_dashboard(user_id: str) -> DashboardSnapshot:
    # TODO(analytics-agent): replace with real computation from DB via
    # app.analytics.health_score + app.forecast.cashflow
    return demo_dashboard_snapshot(user_id)


@router.post("/chat", response_model=AnswerContract)
def chat(req: ChatRequest) -> AnswerContract:
    # TODO(copilot-agent): route through Gemini function-calling loop
    # (app.copilot.engine.answer). Offline fallback lives there too.
    if not req.message.strip():
        raise HTTPException(400, "message must not be empty")
    return AnswerContract(
        query=req.message,
        narrative="Copilot engine not yet wired up -- this is a stub response.",
        facts=[Fact(text="This is placeholder data from the Phase-0 stub API.")],
    )


@router.post("/simulate/{user_id}", response_model=SimulationResult)
def simulate(user_id: str, req: SimulationRequest) -> SimulationResult:
    # TODO(forecast-sim-agent): replace with app.simulate.engine.run
    snap = demo_dashboard_snapshot(user_id)
    return SimulationResult(
        request=req,
        health_score_before=snap.health_score.overall,
        health_score_after=snap.health_score.overall + 4,
        forecast_before=snap.forecast,
        forecast_after=snap.forecast,
        impact=snap.insights.recommendations[0].impact if snap.insights.recommendations else None,
        confidence=0.5,
    )


@router.post("/events/{user_id}", response_model=RecomputeDiff)
def add_event(user_id: str, payload: dict) -> RecomputeDiff:
    # TODO(analytics-agent + forecast-sim-agent): persist event, recompute
    # snapshot, diff against last insights_snapshots row.
    snap = demo_dashboard_snapshot(user_id)
    return RecomputeDiff(
        trigger=payload.get("kind", "unknown"),
        health_score_before=snap.health_score.overall,
        health_score_after=snap.health_score.overall,
        narrative="Recompute pipeline not yet wired up -- this is a stub response.",
    )
