"""Transactions ledger: paginated/filterable/searchable list + manual
recategorization. Owned by ledger-budgets-backend-agent -- exported as
`router` for the integration lead to `app.include_router(...)` into
`app.main`. Deliberately does NOT touch app/api/routes.py or app/main.py to
avoid merge conflicts with the sibling goals/net-worth agent.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

from app.core.auth import resolve_user_id
from app.core.db import engine
from app.models import TransactionRow
from app.schemas import Transaction, TransactionPage, TransactionUpdate, TxnCategory

router = APIRouter()

_MAX_PAGE_SIZE = 200


@router.get("/transactions/{user_id}", response_model=TransactionPage)
def list_transactions(
    user_id: str = Depends(resolve_user_id),
    category: str | None = Query(default=None),
    merchant: str | None = Query(default=None, description="Case-insensitive substring match"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None, description="Matches merchant OR description, case-insensitive"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1),
) -> TransactionPage:
    page_size = min(page_size, _MAX_PAGE_SIZE)

    if category is not None:
        try:
            TxnCategory(category)
        except ValueError:
            raise HTTPException(400, f"Unknown category: {category!r}")

    conditions = [TransactionRow.user_id == user_id]
    if category is not None:
        conditions.append(TransactionRow.category == category)
    if merchant is not None:
        conditions.append(func.lower(TransactionRow.merchant).contains(merchant.lower()))
    if date_from is not None:
        conditions.append(TransactionRow.date >= date_from)
    if date_to is not None:
        conditions.append(TransactionRow.date <= date_to)
    if search is not None:
        needle = f"%{search.lower()}%"
        conditions.append(
            func.lower(TransactionRow.merchant).like(needle)
            | func.lower(func.coalesce(TransactionRow.description, "")).like(needle)
        )

    with Session(engine) as session:
        total = session.exec(
            select(func.count()).select_from(TransactionRow).where(*conditions)
        ).one()

        rows = session.exec(
            select(TransactionRow)
            .where(*conditions)
            .order_by(TransactionRow.date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()

    items = [Transaction(**row.model_dump()) for row in rows]
    return TransactionPage(items=items, total=int(total), page=page, page_size=page_size)


@router.patch("/transactions/{user_id}/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: str,
    update: TransactionUpdate,
    user_id: str = Depends(resolve_user_id),
) -> Transaction:
    with Session(engine) as session:
        row = session.get(TransactionRow, transaction_id)
        # Real authorization check, not just an existence check: a
        # transaction that exists but belongs to a different user_id must
        # 404 exactly like a nonexistent id, so callers can't distinguish
        # "not found" from "not yours" (no existence leak / IDOR).
        if row is None or row.user_id != user_id:
            raise HTTPException(404, "Transaction not found")

        if update.category is not None:
            row.category = update.category.value
        if update.merchant is not None:
            row.merchant = update.merchant

        session.add(row)
        session.commit()
        session.refresh(row)

        return Transaction(**row.model_dump())
