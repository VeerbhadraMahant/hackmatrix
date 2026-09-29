"""Budgets: per-category monthly limits, spend-vs-limit status, and a
"safe to spend today" number. Owned by ledger-budgets-backend-agent --
exported as `router` for the integration lead to `app.include_router(...)`
into `app.main`. Deliberately does NOT touch app/api/routes.py or
app/main.py to avoid merge conflicts with the sibling goals/net-worth agent.
"""
from __future__ import annotations

import calendar
from datetime import date, datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.analytics.recurring import detect_recurring
from app.core.auth import resolve_user_id
from app.core.db import engine
from app.models import BudgetRow, TransactionRow
from app.schemas import (
    Budget,
    BudgetCreateRequest,
    BudgetStatus,
    RecurringObligation,
    SafeToSpend,
    TxnCategory,
)

router = APIRouter()

# Categories that are not real discretionary/committed spend for
# safe-to-spend purposes -- same exclusion app.analytics.savings and
# app.ingest.snapshot use (transfers between own accounts aren't new spend;
# a credit-card bill payment double-counts spend already booked against the
# original purchase category).
_EXCLUDED_FROM_SPEND = {TxnCategory.transfer.value, TxnCategory.credit_card_payment.value}

_NEAR_THRESHOLD = 0.8  # 80% of limit


def _transactions_df(rows: list[TransactionRow]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(
            columns=["id", "user_id", "account_id", "date", "amount", "merchant", "category", "is_recurring", "recurring_group_id"]
        )
    df = pd.DataFrame([r.model_dump() for r in rows])
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


@router.get("/budgets/{user_id}", response_model=list[Budget])
def list_budgets(user_id: str = Depends(resolve_user_id)) -> list[Budget]:
    with Session(engine) as session:
        rows = session.exec(select(BudgetRow).where(BudgetRow.user_id == user_id)).all()
    return [Budget(id=r.id, user_id=r.user_id, category=r.category, monthly_limit=r.monthly_limit) for r in rows]


@router.post("/budgets/{user_id}", response_model=Budget)
def upsert_budget(req: BudgetCreateRequest, user_id: str = Depends(resolve_user_id)) -> Budget:
    if req.monthly_limit < 0:
        raise HTTPException(400, "monthly_limit must be >= 0")

    with Session(engine) as session:
        existing = session.exec(
            select(BudgetRow).where(BudgetRow.user_id == user_id, BudgetRow.category == req.category.value)
        ).first()
        if existing is not None:
            existing.monthly_limit = req.monthly_limit
            session.add(existing)
            session.commit()
            session.refresh(existing)
            row = existing
        else:
            row = BudgetRow(user_id=user_id, category=req.category.value, monthly_limit=req.monthly_limit)
            session.add(row)
            session.commit()
            session.refresh(row)

        return Budget(id=row.id, user_id=row.user_id, category=row.category, monthly_limit=row.monthly_limit)


@router.delete("/budgets/{user_id}/{budget_id}")
def delete_budget(budget_id: str, user_id: str = Depends(resolve_user_id)) -> dict:
    with Session(engine) as session:
        row = session.get(BudgetRow, budget_id)
        if row is None or row.user_id != user_id:
            raise HTTPException(404, "Budget not found")
        session.delete(row)
        session.commit()
    return {"deleted": True, "id": budget_id}


def _spent_this_month(df: pd.DataFrame, category: str, as_of: date) -> float:
    """Sum of |outflow| for `category` in the current calendar month
    (as_of.year/as_of.month), excluding transfers/CC-bill-payments (see
    module docstring)."""
    if df.empty:
        return 0.0
    work = df[
        (df["category"] == category)
        & (df["amount"] < 0)
        & (df["date"].dt.year == as_of.year)
        & (df["date"].dt.month == as_of.month)
        & (~df["category"].isin(_EXCLUDED_FROM_SPEND))
    ]
    return float(-work["amount"].sum())


@router.get("/budgets/{user_id}/status", response_model=list[BudgetStatus])
def budget_status(user_id: str = Depends(resolve_user_id)) -> list[BudgetStatus]:
    today = datetime.now(timezone.utc).date()

    with Session(engine) as session:
        budgets = session.exec(select(BudgetRow).where(BudgetRow.user_id == user_id)).all()
        txn_rows = session.exec(select(TransactionRow).where(TransactionRow.user_id == user_id)).all()

    df = _transactions_df(list(txn_rows))

    statuses: list[BudgetStatus] = []
    for b in budgets:
        spent = _spent_this_month(df, b.category, today)
        remaining = b.monthly_limit - spent
        percent_used = (spent / b.monthly_limit * 100.0) if b.monthly_limit > 0 else (100.0 if spent > 0 else 0.0)

        if percent_used > 100.0:
            health = "over"
        elif percent_used >= _NEAR_THRESHOLD * 100.0:
            health = "near"
        else:
            health = "under"

        statuses.append(
            BudgetStatus(
                category=b.category,
                monthly_limit=b.monthly_limit,
                spent_so_far=spent,
                remaining=remaining,
                percent_used=round(percent_used, 1),
                status=health,
            )
        )
    return statuses


def _monthly_income(df: pd.DataFrame, recurring_all: list[RecurringObligation]) -> float:
    """Monthly income used as the safe-to-spend basis. Prefer the detected
    recurring income series (app.analytics.recurring.detect_recurring),
    since it's the same salary-cadence signal the dashboard snapshot uses.
    Falls back to a trailing-3-month average of positive (income-labeled)
    transactions if no recurring income series was detected yet (e.g. fewer
    than 3 salary credits on record)."""
    income_recurring = [r for r in recurring_all if r.category == TxnCategory.income]
    if income_recurring:
        return float(income_recurring[0].amount)

    if df.empty:
        return 0.0
    as_of = df["date"].max()
    window_start = as_of - pd.DateOffset(months=3)
    window = df[(df["date"] > window_start) & (df["date"] <= as_of)]
    income_txns = window[(window["category"] == TxnCategory.income.value) & (window["amount"] > 0)]
    if income_txns.empty:
        return 0.0
    return float(income_txns["amount"].sum()) / 3.0


def _monthly_equivalent_obligation(r: RecurringObligation) -> float:
    """Normalize a recurring obligation's magnitude to a monthly run-rate so
    weekly/biweekly/quarterly/annual commitments are comparable on the same
    monthly basis as `monthly_income`. E.g. a quarterly ₹3000 payment is
    ₹1000/month of committed obligation."""
    interval_days = {
        "weekly": 7,
        "biweekly": 14,
        "monthly": 30,
        "quarterly": 90,
        "annual": 365,
    }.get(r.frequency.value, 30)
    return abs(r.amount) * (30.0 / interval_days)


@router.get("/budgets/{user_id}/safe-to-spend", response_model=SafeToSpend)
def safe_to_spend(user_id: str = Depends(resolve_user_id)) -> SafeToSpend:
    """"Safe to spend today" = how much of today's remaining discretionary
    budget for the rest of THIS calendar month is still unspent, spread
    evenly across the days left in the month.

    Formula (documented here since this is a judged, user-facing number):

        safe_to_spend = max(
            0,
            (monthly_income
             - committed_recurring_this_month   # rent, EMIs, subscriptions, etc.
             - discretionary_spend_so_far_this_month)
            / days_remaining_in_current_month
        )

    Where:
      * `monthly_income` -- see `_monthly_income` (detected recurring salary
        cadence, or a trailing-3-month average fallback).
      * `committed_recurring_this_month` -- every detected recurring
        obligation (app.analytics.recurring.detect_recurring; excludes the
        income entry itself) normalized to a monthly-equivalent run-rate
        (see `_monthly_equivalent_obligation`), summed. This represents cash
        already earmarked for rent/EMI/subscriptions/etc. regardless of
        whether its exact due date has occurred yet this month -- it is a
        planning number, not a ledger of what's already left the account.
      * `discretionary_spend_so_far_this_month` -- actual outflow
        transactions dated in the current calendar month that are NOT
        themselves part of a detected recurring series (is_recurring is
        False) and are not transfers/CC-bill-payments (see
        `_EXCLUDED_FROM_SPEND`) -- i.e. the spend that competes with
        "safe to spend today" money, as opposed to money already
        earmarked/committed.
      * `days_remaining_in_current_month` -- inclusive of today, so the
        number spreads today's opportunity across today and the days after.
      * Floored at 0 -- never tells the user to "spend" a negative amount.
    """
    today = datetime.now(timezone.utc).date()

    with Session(engine) as session:
        txn_rows = session.exec(select(TransactionRow).where(TransactionRow.user_id == user_id)).all()

    df = _transactions_df(list(txn_rows))
    recurring_all = detect_recurring(df)

    monthly_income = _monthly_income(df, recurring_all)
    committed_recurring = sum(
        _monthly_equivalent_obligation(r) for r in recurring_all if r.category != TxnCategory.income
    )

    if df.empty:
        discretionary_spent = 0.0
    else:
        discretionary = df[
            (df["amount"] < 0)
            & (df["date"].dt.year == today.year)
            & (df["date"].dt.month == today.month)
            & (~df["is_recurring"].astype(bool))
            & (~df["category"].isin(_EXCLUDED_FROM_SPEND))
        ]
        discretionary_spent = float(-discretionary["amount"].sum())

    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_remaining = max(1, days_in_month - today.day + 1)

    raw = (monthly_income - committed_recurring - discretionary_spent) / days_remaining
    amount = max(0.0, raw)

    basis = (
        f"(monthly income ₹{monthly_income:,.0f} - committed recurring "
        f"₹{committed_recurring:,.0f}/mo - discretionary spend so far this month "
        f"₹{discretionary_spent:,.0f}) / {days_remaining} day(s) left in "
        f"{today.strftime('%B %Y')}, floored at 0."
    )

    return SafeToSpend(amount=round(amount, 2), basis=basis, as_of_date=today)
