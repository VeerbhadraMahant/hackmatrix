"""SQLModel ORM models -- mirror supabase/migrations/*.sql exactly.

Every user-owned table carries `user_id` (Supabase auth.uid()) and RLS is
enforced at the Postgres level (see migrations); these models are used for
querying via SQLAlchemy with the service-role connection on the backend.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


class AccountRow(SQLModel, table=True):
    __tablename__ = "accounts"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    type: str
    balance: float
    credit_limit: float | None = None
    interest_rate_apr: float | None = None
    currency: str = "INR"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionRow(SQLModel, table=True):
    __tablename__ = "transactions"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    account_id: str = Field(index=True)
    date: date
    amount: float
    merchant: str
    category: str
    description: str | None = None
    is_recurring: bool = False
    recurring_group_id: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DebtRow(SQLModel, table=True):
    __tablename__ = "debts"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    account_id: str
    principal: float
    interest_rate_apr: float
    minimum_payment: float
    due_day_of_month: int


class IncomeRow(SQLModel, table=True):
    __tablename__ = "incomes"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    source: str
    amount: float
    frequency: str
    next_date: date


class GoalRow(SQLModel, table=True):
    __tablename__ = "goals"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    target_amount: float
    target_date: date | None = None
    current_amount: float = 0


class EventRow(SQLModel, table=True):
    """Audit log of user-triggered changes (new txn batch, new income, new
    loan, manual edit) that drive the /timeline recompute-diff view."""

    __tablename__ = "events"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    kind: str
    payload_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InsightsSnapshotRow(SQLModel, table=True):
    """Cached DashboardSnapshot JSON so /timeline can diff before/after
    without recomputing the "before" state."""

    __tablename__ = "insights_snapshots"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(index=True)
    snapshot_json: str
    health_score: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
