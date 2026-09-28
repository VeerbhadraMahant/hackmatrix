"""API routes. Phase-0 stubs return fixture data so the frontend can build
against a stable contract immediately; each background agent replaces the
relevant stub with real logic (see comments) without changing response
shapes (those are fixed in app.schemas).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile
from sqlmodel import Session, select

from app.copilot.engine import answer as copilot_answer
from app.core.config import get_settings
from app.core.db import engine
from app.forecast.alerts import maybe_send_gap_alert
from app.ingest.categorize import categorize
from app.ingest.snapshot import build_dashboard_snapshot, get_last_snapshot
from app.ingest.upload import parse_transaction_csv
from app.models import AccountRow, EventRow, TransactionRow
from app.schemas import (
    AnswerContract,
    ChatRequest,
    DashboardSnapshot,
    RecomputeDiff,
    SimulationRequest,
    SimulationResult,
)
from app.simulate.engine import ForecastInputs, simulate

router = APIRouter()

_LIQUID_ACCOUNT_TYPES = {"checking", "savings"}


def _starting_balance_for_user(user_id: str, session: Session) -> float:
    """Real starting balance: sum of the user's checking+savings account
    balances (see app.ingest.snapshot module docstring for the rationale).
    Recomputed here directly from Account rows (rather than stashed on
    DashboardSnapshot, which has no dedicated field for it) so this stays a
    single source of truth shared with build_dashboard_snapshot."""
    accounts = session.exec(select(AccountRow).where(AccountRow.user_id == user_id)).all()
    if not accounts:
        return 42_000.0  # fixture-fallback users have no Account rows
    return float(sum(a.balance for a in accounts if a.type in _LIQUID_ACCOUNT_TYPES))


def _forecast_inputs_from_snapshot(snap: DashboardSnapshot, user_id: str, session: Session) -> ForecastInputs:
    """Build simulate.engine.ForecastInputs from a DashboardSnapshot plus a
    real starting balance looked up from the DB."""
    starting_balance = _starting_balance_for_user(user_id, session)
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
    with Session(engine) as session:
        return build_dashboard_snapshot(user_id, session)


@router.post("/chat", response_model=AnswerContract)
def chat(req: ChatRequest) -> AnswerContract:
    if not req.message.strip():
        raise HTTPException(400, "message must not be empty")
    return copilot_answer(req.user_id, req.message)


@router.post("/simulate/{user_id}", response_model=SimulationResult)
def run_simulation(user_id: str, req: SimulationRequest) -> SimulationResult:
    with Session(engine) as session:
        snap = build_dashboard_snapshot(user_id, session)
        inputs = _forecast_inputs_from_snapshot(snap, user_id, session)
    try:
        return simulate(
            req.action,
            req.action_params,
            current_forecast_inputs=inputs,
            current_health_score=snap.health_score.overall,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/upload/{user_id}", response_model=RecomputeDiff)
async def upload_transactions(user_id: str, file: UploadFile) -> RecomputeDiff:
    """Accepts a multipart bank-statement CSV, parses + categorizes it, and
    persists the resulting transactions for `user_id`. account_id defaults to
    a synthetic per-user "uploaded" account since bank CSV exports rarely
    carry our internal account ids.

    Returns a real before/after RecomputeDiff: "before" is whatever snapshot
    was last cached for this user (or a freshly computed one if none was
    cached yet), "after" is recomputed post-ingest.
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
        before = get_last_snapshot(user_id, session) or build_dashboard_snapshot(user_id, session)

        for row in rows:
            session.add(row)
        session.commit()

        after = build_dashboard_snapshot(user_id, session)

    return _build_recompute_diff(trigger="csv_upload", before=before, after=after,
                                  extra_narrative=f"Ingested {len(rows)} transactions from {file.filename or 'uploaded file'}.")


def _build_recompute_diff(*, trigger: str, before: DashboardSnapshot, after: DashboardSnapshot,
                           extra_narrative: str = "") -> RecomputeDiff:
    """Diff two DashboardSnapshots into a RecomputeDiff: which recommended
    actions are new, which are no longer recommended, and how the headline
    numbers (health score, first cash-flow gap) moved."""
    before_actions = {r.action for r in before.insights.recommendations}
    after_by_action = {r.action: r for r in after.insights.recommendations}

    new_recommendations = [r for r in after.insights.recommendations if r.action not in before_actions]
    removed_actions = [a for a in before_actions if a not in after_by_action]

    delta = after.health_score.overall - before.health_score.overall
    narrative_parts = [extra_narrative] if extra_narrative else []
    if abs(delta) < 0.05:
        narrative_parts.append(f"Health score is essentially unchanged ({after.health_score.overall:.1f}).")
    else:
        direction = "improved" if delta > 0 else "declined"
        narrative_parts.append(
            f"Health score {direction} from {before.health_score.overall:.1f} to "
            f"{after.health_score.overall:.1f} ({delta:+.1f})."
        )
    if before.forecast.first_gap_date != after.forecast.first_gap_date:
        narrative_parts.append(
            f"Projected cash-flow gap date moved from {before.forecast.first_gap_date} to "
            f"{after.forecast.first_gap_date}."
        )
    if new_recommendations:
        narrative_parts.append(f"{len(new_recommendations)} new recommendation(s) surfaced.")
    if removed_actions:
        narrative_parts.append(f"{len(removed_actions)} recommendation(s) are no longer relevant.")

    return RecomputeDiff(
        trigger=trigger,
        health_score_before=before.health_score.overall,
        health_score_after=after.health_score.overall,
        forecast_first_gap_before=before.forecast.first_gap_date,
        forecast_first_gap_after=after.forecast.first_gap_date,
        new_recommendations=new_recommendations,
        removed_recommendation_actions=removed_actions,
        narrative=" ".join(narrative_parts),
    )


@router.post("/events/{user_id}", response_model=RecomputeDiff)
def add_event(user_id: str, payload: dict) -> RecomputeDiff:
    """Persist a new event (transaction, income, or debt) for `user_id`, then
    recompute the dashboard snapshot before vs. after so the UI can show
    exactly how recommendations/health score/forecast changed.

    Expected payload shapes (all keyed by "kind"):
      {"kind": "transaction", "amount": -450, "merchant": "...",
       "category": "dining" (optional -- categorized if omitted),
       "date": "2026-09-29" (optional -- defaults to today),
       "account_id": "..." (optional -- defaults to the user's first
       checking account, or a synthetic "acc-events-{user_id}")}
    """
    kind = payload.get("kind", "transaction")

    with Session(engine) as session:
        before = get_last_snapshot(user_id, session) or build_dashboard_snapshot(user_id, session)

        if kind == "transaction":
            amount = payload.get("amount")
            if amount is None:
                raise HTTPException(400, "transaction event requires 'amount'")
            merchant = payload.get("merchant", "Manual entry")
            category = payload.get("category")
            if category:
                category_value = category
            else:
                category_value = categorize(merchant, float(amount)).value
            txn_date_str = payload.get("date")
            txn_date = (
                datetime.strptime(txn_date_str, "%Y-%m-%d").date()
                if txn_date_str
                else datetime.now(timezone.utc).date()
            )
            account_id = payload.get("account_id")
            if not account_id:
                checking = session.exec(
                    select(AccountRow).where(AccountRow.user_id == user_id, AccountRow.type == "checking")
                ).first()
                account_id = checking.id if checking else f"acc-events-{user_id}"

            session.add(
                TransactionRow(
                    user_id=user_id,
                    account_id=account_id,
                    date=txn_date,
                    amount=float(amount),
                    merchant=merchant,
                    category=category_value,
                    description=payload.get("description"),
                    is_recurring=bool(payload.get("is_recurring", False)),
                    recurring_group_id=payload.get("recurring_group_id"),
                )
            )
        else:
            raise HTTPException(400, f"Unsupported event kind: {kind!r}")

        session.add(EventRow(user_id=user_id, kind=kind, payload_json=json.dumps(payload, default=str)))
        session.commit()

        after = build_dashboard_snapshot(user_id, session)

    return _build_recompute_diff(trigger=kind, before=before, after=after)


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

    with Session(engine) as session:
        snap = build_dashboard_snapshot(user_id, session)
    sent = maybe_send_gap_alert(user_email, snap.forecast)
    return {"sent": sent}
