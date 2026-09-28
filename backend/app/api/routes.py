"""API routes. Phase-0 stubs return fixture data so the frontend can build
against a stable contract immediately; each background agent replaces the
relevant stub with real logic (see comments) without changing response
shapes (those are fixed in app.schemas).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.forecast.alerts import maybe_send_gap_alert
from app.ingest.fixtures import demo_dashboard_snapshot
from app.recommend.engine import generate_recommendations
from app.schemas import (
    AnswerContract,
    ChatRequest,
    DashboardSnapshot,
    Fact,
    RecomputeDiff,
    SimulationRequest,
    SimulationResult,
)
from app.simulate.engine import ForecastInputs, simulate

router = APIRouter()


def _forecast_inputs_from_snapshot(snap: DashboardSnapshot) -> ForecastInputs:
    """Build simulate.engine.ForecastInputs from a DashboardSnapshot.

    # TODO(integration): once analytics-agent/data-agent's DB-backed state
    # is available, replace `demo_dashboard_snapshot(user_id)` call sites
    # below with a real per-user snapshot builder and pass real transaction
    # history through `transactions=` here instead of leaving it None.
    """
    # crude starting balance estimate: net worth minus debt principal, since
    # DashboardSnapshot doesn't expose a dedicated checking balance field.
    # TODO(integration): replace with the user's actual checking account
    # balance once Account records are wired through.
    starting_balance = 42_000.0
    return ForecastInputs(
        starting_balance=starting_balance,
        recurring=snap.recurring_obligations,
        debts=snap.debts,
        transactions=None,
        horizon_days=snap.forecast.horizon_days,
        monthly_income=snap.monthly_income,
    )


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
def run_simulation(user_id: str, req: SimulationRequest) -> SimulationResult:
    # TODO(integration): demo_dashboard_snapshot is a Phase-0 fixture stand-in
    # for real per-user DB state; swap for a real snapshot builder once
    # data-agent/analytics-agent land.
    snap = demo_dashboard_snapshot(user_id)
    inputs = _forecast_inputs_from_snapshot(snap)
    try:
        return simulate(
            req.action,
            req.action_params,
            current_forecast_inputs=inputs,
            current_health_score=snap.health_score.overall,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/events/{user_id}", response_model=RecomputeDiff)
def add_event(user_id: str, payload: dict) -> RecomputeDiff:
    # TODO(analytics-agent + forecast-sim-agent): persist event, recompute
    # snapshot, diff against last insights_snapshots row. For now this
    # recomputes recommendations against the fixture snapshot so the diff
    # shape is real even though the "event" itself isn't yet persisted.
    snap = demo_dashboard_snapshot(user_id)
    inputs = _forecast_inputs_from_snapshot(snap)
    new_recs = generate_recommendations(
        recurring=snap.recurring_obligations,
        debts=snap.debts,
        health_score=snap.health_score,
        forecast=snap.forecast,
        forecast_inputs=inputs,
    )
    return RecomputeDiff(
        trigger=payload.get("kind", "unknown"),
        health_score_before=snap.health_score.overall,
        health_score_after=snap.health_score.overall,
        forecast_first_gap_before=snap.forecast.first_gap_date,
        forecast_first_gap_after=snap.forecast.first_gap_date,
        new_recommendations=new_recs,
        narrative=(
            "Recompute pipeline is wired to the real recommendation engine, "
            "but event persistence and true before/after diffing depend on "
            "data-agent/analytics-agent DB integration -- this response "
            "recomputes recommendations against the current fixture snapshot."
        ),
    )


@router.post("/alerts/gap/{user_id}")
def send_gap_alert(user_id: str, payload: dict) -> dict:
    """Explicit, user-triggered cash-flow gap alert email. Not called
    automatically by any other route -- must be invoked by a frontend
    button so we never spam users on every dashboard load."""
    settings = get_settings()
    if not settings.has_resend:
        raise HTTPException(503, "Email alerts are not configured (no RESEND_API_KEY).")

    user_email = payload.get("email")
    if not user_email:
        raise HTTPException(400, "payload must include 'email'")

    # TODO(integration): replace with a real per-user forecast once
    # DB-backed state is available.
    snap = demo_dashboard_snapshot(user_id)
    sent = maybe_send_gap_alert(user_email, snap.forecast)
    return {"sent": sent}
