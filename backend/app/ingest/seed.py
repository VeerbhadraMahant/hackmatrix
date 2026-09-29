"""CLI to (re)seed the 3 demo personas into the configured database.

Usage (from backend/):
    python -m app.ingest.seed

Idempotent: safe to re-run -- clears and reinserts all rows for each demo
user_id (demo-priya, demo-arjun, demo-meera) rather than accumulating
duplicates.
"""
from __future__ import annotations

from sqlmodel import Session, delete, select

from app.core.db import engine, init_db
from app.models import AccountRow, DebtRow, IncomeRow, TransactionRow
from app.ingest.personas import PERSONA_CONFIGS, generate_persona


def _clear_user(session: Session, user_id: str) -> None:
    session.exec(delete(TransactionRow).where(TransactionRow.user_id == user_id))
    session.exec(delete(DebtRow).where(DebtRow.user_id == user_id))
    session.exec(delete(IncomeRow).where(IncomeRow.user_id == user_id))
    session.exec(delete(AccountRow).where(AccountRow.user_id == user_id))


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
            session.commit()

            print(
                f"Seeded {user_id}: {len(data.accounts)} accounts, "
                f"{len(data.transactions)} transactions, {len(data.debts)} debts, "
                f"{len(data.incomes)} incomes"
            )


def seed_if_empty() -> None:
    """Seed the demo personas only if they're missing (fresh/ephemeral DB,
    e.g. a serverless cold start). Cheap no-op otherwise."""
    init_db()
    with Session(engine) as session:
        if session.exec(select(AccountRow).where(AccountRow.user_id == "demo-priya")).first() is None:
            seed_all()


if __name__ == "__main__":
    seed_all()
