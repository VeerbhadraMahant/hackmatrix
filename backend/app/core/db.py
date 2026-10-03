"""DB engine/session. Uses Postgres (Supabase) when DATABASE_URL is a
postgres:// URL, otherwise falls back to a local sqlite file so the backend
and tests run fully offline."""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings

settings = get_settings()

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=_connect_args)


def _run_migrations(db_engine) -> None:
    """Idempotently add new columns to existing SQLite/Postgres tables."""
    with db_engine.begin() as conn:
        inspector = inspect(conn)
        tables = inspector.get_table_names()
        if "transactions" in tables:
            columns = {col["name"] for col in inspector.get_columns("transactions")}
            if "tags" not in columns:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN tags TEXT"))
            if "notes" not in columns:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN notes TEXT"))
            if "review_status" not in columns:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN review_status TEXT DEFAULT 'pending'"))
            if "reviewed_at" not in columns:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN reviewed_at TIMESTAMP"))


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _run_migrations(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
