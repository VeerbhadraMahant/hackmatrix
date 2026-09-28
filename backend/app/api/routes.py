"""API routes. Phase-0 stubs return fixture data so the frontend can build
against a stable contract immediately; each background agent replaces the
relevant stub with real logic (see comments) without changing response
shapes (those are fixed in app.schemas).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile
from sqlmodel import Session

from app.core.db import engine
from app.ingest.fixtures import demo_dashboard_snapshot
from app.ingest.upload import parse_transaction_csv
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


@router.post("/upload/{user_id}", response_model=RecomputeDiff)
async def upload_transactions(user_id: str, file: UploadFile) -> RecomputeDiff:
    """Accepts a multipart bank-statement CSV, parses + categorizes it, and
    persists the resulting transactions for `user_id`. account_id defaults to
    a synthetic per-user "uploaded" account since bank CSV exports rarely
    carry our internal account ids.

    # TODO(analytics-agent): replace the stub RecomputeDiff below with a real
    # before/after health-score + forecast recompute once
    # app.analytics.health_score / app.forecast.cashflow exist. This route
    # only handles ingestion + categorization + persistence for now.
    """
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "uploaded file is empty")

    account_id = f"acc-uploaded-{user_id}"
    try:
        rows = parse_transaction_csv(raw, user_id=user_id, account_id=account_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    with Session(engine) as session:
        for row in rows:
            session.add(row)
        session.commit()

    snap = demo_dashboard_snapshot(user_id)
    return RecomputeDiff(
        trigger="csv_upload",
        health_score_before=snap.health_score.overall,
        health_score_after=snap.health_score.overall,
        narrative=(
            f"Ingested {len(rows)} transactions from {file.filename or 'uploaded file'}. "
            "Recompute pipeline not yet wired up -- health score/forecast diff is a stub."
        ),
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
