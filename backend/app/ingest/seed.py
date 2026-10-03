"""CLI to (re)seed the 3 demo personas into the configured database.

Usage (from backend/):
    python -m app.ingest.seed

Idempotent: safe to re-run -- clears and reinserts all rows for each demo
user_id (demo-priya, demo-arjun, demo-meera) rather than accumulating
duplicates.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, delete, select

from app.core.db import engine, init_db
from app.models import (
    AccountRow,
    BudgetRow,
    CategorizationRuleRow,
    DebtRow,
    GoalRow,
    HouseholdInviteRow,
    HouseholdMemberRow,
    HouseholdRow,
    IncomeRow,
    TransactionRow,
)
from app.ingest.personas import PERSONA_CONFIGS, generate_persona


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _clear_user(session: Session, user_id: str) -> None:
    session.exec(delete(TransactionRow).where(TransactionRow.user_id == user_id))
    session.exec(delete(DebtRow).where(DebtRow.user_id == user_id))
    session.exec(delete(IncomeRow).where(IncomeRow.user_id == user_id))
    session.exec(delete(AccountRow).where(AccountRow.user_id == user_id))
    session.exec(delete(CategorizationRuleRow).where(CategorizationRuleRow.user_id == user_id))
    session.exec(delete(BudgetRow).where(BudgetRow.user_id == user_id))
    session.exec(delete(GoalRow).where(GoalRow.user_id == user_id))
    session.exec(delete(HouseholdMemberRow).where(HouseholdMemberRow.user_id == user_id))
    session.exec(delete(HouseholdRow).where(HouseholdRow.owner_user_id == user_id))
    session.exec(delete(HouseholdInviteRow).where(HouseholdInviteRow.invited_by_user_id == user_id))


def seed_all() -> None:
    init_db()
    with Session(engine) as session:
        for user_id, config in PERSONA_CONFIGS.items():
            _clear_user(session, user_id)
            session.commit()

            data = generate_persona(config)
            for account in data.accounts:
                session.add(account)
            session.commit()  # commit accounts first so FKs (account_id) are valid

            for txn in data.transactions:
                session.add(txn)
            for debt in data.debts:
                session.add(debt)
            for income in data.incomes:
                session.add(income)
            for rule in data.rules:
                session.add(rule)
            for budget in data.budgets:
                session.add(budget)
            for goal in data.goals:
                session.add(goal)
            session.commit()

            print(
                f"Seeded {user_id}: {len(data.accounts)} accounts, "
                f"{len(data.transactions)} transactions, {len(data.debts)} debts, "
                f"{len(data.incomes)} incomes, {len(data.rules)} rules, {len(data.budgets)} budgets, "
                f"{len(data.goals)} goals"
            )

        # Seed shared household for Priya & Arjun
        now = datetime.now(timezone.utc)
        hh = HouseholdRow(
            id="hh-priya-arjun",
            name="Priya & Partner Family",
            owner_user_id="demo-priya",
            created_at=now - timedelta(days=60),
        )
        session.add(hh)
        session.commit()

        m1 = HouseholdMemberRow(
            household_id="hh-priya-arjun",
            user_id="demo-priya",
            role="owner",
            joined_at=now - timedelta(days=60),
        )
        m2 = HouseholdMemberRow(
            household_id="hh-priya-arjun",
            user_id="demo-arjun",
            role="editor",
            joined_at=now - timedelta(days=45),
        )
        session.add(m1)
        session.add(m2)

        inv1 = HouseholdInviteRow(
            household_id="hh-priya-arjun",
            invited_email="rohan.sharma@example.com",
            role="editor",
            token_hash=_hash_token("demo-partner-token-rohan"),
            status="pending",
            invited_by_user_id="demo-priya",
            created_at=now - timedelta(days=2),
            expires_at=now + timedelta(days=5),
        )
        session.add(inv1)
        session.commit()
        print("Seeded demo household: 'Priya & Partner Family' (Members: Priya, Arjun; Pending: Rohan)")


def seed_if_empty() -> None:
    """Seed the demo personas only if they're missing (fresh/ephemeral DB,
    e.g. a serverless cold start). Cheap no-op otherwise."""
    init_db()
    with Session(engine) as session:
        if session.exec(select(AccountRow).where(AccountRow.user_id == "demo-priya")).first() is None:
            seed_all()


if __name__ == "__main__":
    seed_all()
