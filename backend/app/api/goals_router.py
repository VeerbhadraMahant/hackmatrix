"""Goals CRUD + live progress projection.

Not wired into app.main by this module -- the lead integrates
`goals_router.router` into main.py alongside the sibling ledger/budgets
router, to avoid both agents touching the same file.

Monthly-contribution estimate (used for GET's progress projection): we take
the user's trailing-3-month average net savings, i.e.
`monthly_income * trailing_savings_rate(df, months=3)`, using the same
trailing window and exclusions (transfers, credit-card bill payments) as
`app.ingest.snapshot.build_dashboard_snapshot` uses for its own
`monthly_income` / `savings_rate` fields, so this stays consistent with what
the dashboard already reports. This is a reasonable proxy for "cash the user
could actually put toward a goal each month" without inventing a new signal:
it's literally what's left over after their recent real income minus real
expenses. If a user has no transaction history (fixture-fallback / brand new
account), the estimate is 0 and `project_goal` reports `on_track=False`,
`projected_completion_date=None` -- an honest "we don't have enough data"
answer rather than a fabricated number.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.analytics.goals import project_goal
from app.analytics.savings import trailing_savings_rate
from app.core.auth import resolve_user_id
from app.core.db import engine
from app.ingest.snapshot import _avg_income_expenses, _transactions_df
from app.models import GoalRow, TransactionRow
from app.schemas import Goal, GoalCreateRequest, GoalProgress, GoalUpdateRequest

router = APIRouter()

_TRAILING_MONTHS = 3


def _goal_row_to_schema(row: GoalRow) -> Goal:
    return Goal(
        id=row.id,
        user_id=row.user_id,
        name=row.name,
        target_amount=row.target_amount,
        target_date=row.target_date,
        current_amount=row.current_amount,
    )


def _estimated_monthly_contribution(user_id: str, session: Session) -> float:
    """See module docstring: trailing-3-month avg income * trailing savings
    rate, floored at 0 (a negative "contribution" isn't meaningful for a
    forward goal projection)."""
    txn_rows = session.exec(select(TransactionRow).where(TransactionRow.user_id == user_id)).all()
    df = _transactions_df(list(txn_rows))
    if df.empty:
        return 0.0
    monthly_income, _ = _avg_income_expenses(df, months=_TRAILING_MONTHS)
    rate = trailing_savings_rate(df, months=_TRAILING_MONTHS)
    return max(0.0, monthly_income * rate)


def _to_progress(goal: Goal, monthly_contribution: float) -> GoalProgress:
    projection = project_goal(goal, monthly_contribution)
    return GoalProgress(
        goal=goal,
        monthly_contribution=monthly_contribution,
        projected_completion_date=projection["projected_completion_date"],
        on_track=projection["on_track"],
        months_remaining=projection["months_remaining"],
    )


@router.get("/api/goals/{user_id}", response_model=list[GoalProgress])
def list_goals(user_id: str = Depends(resolve_user_id)) -> list[GoalProgress]:
    with Session(engine) as session:
        rows = session.exec(select(GoalRow).where(GoalRow.user_id == user_id)).all()
        monthly_contribution = _estimated_monthly_contribution(user_id, session)
    return [_to_progress(_goal_row_to_schema(row), monthly_contribution) for row in rows]


@router.post("/api/goals/{user_id}", response_model=GoalProgress)
def create_goal(req: GoalCreateRequest, user_id: str = Depends(resolve_user_id)) -> GoalProgress:
    with Session(engine) as session:
        row = GoalRow(
            user_id=user_id,
            name=req.name,
            target_amount=req.target_amount,
            target_date=req.target_date,
            current_amount=req.current_amount,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        monthly_contribution = _estimated_monthly_contribution(user_id, session)
    return _to_progress(_goal_row_to_schema(row), monthly_contribution)


def _get_owned_goal(session: Session, user_id: str, goal_id: str) -> GoalRow:
    row = session.get(GoalRow, goal_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(404, "Goal not found")
    return row


@router.patch("/api/goals/{user_id}/{goal_id}", response_model=GoalProgress)
def update_goal(
    goal_id: str, req: GoalUpdateRequest, user_id: str = Depends(resolve_user_id)
) -> GoalProgress:
    with Session(engine) as session:
        row = _get_owned_goal(session, user_id, goal_id)
        if req.name is not None:
            row.name = req.name
        if req.current_amount is not None:
            row.current_amount = req.current_amount
        if req.target_amount is not None:
            row.target_amount = req.target_amount
        if req.target_date is not None:
            row.target_date = req.target_date
        session.add(row)
        session.commit()
        session.refresh(row)
        monthly_contribution = _estimated_monthly_contribution(user_id, session)
    return _to_progress(_goal_row_to_schema(row), monthly_contribution)


@router.delete("/api/goals/{user_id}/{goal_id}")
def delete_goal(goal_id: str, user_id: str = Depends(resolve_user_id)) -> dict:
    with Session(engine) as session:
        row = _get_owned_goal(session, user_id, goal_id)
        session.delete(row)
        session.commit()
    return {"deleted": True, "id": goal_id}
