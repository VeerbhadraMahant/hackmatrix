from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.audit import log_audit_event
from app.core.db import init_db

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="FinPilot API", version="0.1.0", lifespan=lifespan)

# SECURITY: in dev, allow any localhost/127.0.0.1 port (next dev picks a
# different one whenever 3000 is busy). In production, ALLOWED_ORIGINS must
# be set explicitly to the real deployed frontend origin(s) -- comma
# separated -- so the API can't be called cross-origin from an arbitrary
# site with a signed-in user's cookies/token. Unset in prod = no prod
# origins trusted (fails closed, not open).
_prod_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_prod_origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    """Best-effort security audit trail (see app.core.audit): records every
    auth denial/rate-limit hit and every successful mutating request. The
    user_id here is extracted heuristically from the path (the last path
    segment after a known prefix) since middleware runs outside the
    per-route Depends() that resolves+verifies it -- good enough for a
    human reviewing logs, not used for any access-control decision."""
    response = await call_next(request)

    path = request.url.path
    method = request.method
    status = response.status_code

    def _guess_user_id() -> str | None:
        parts = [p for p in path.split("/") if p]
        # /api/dashboard/{user_id}, /api/simulate/{user_id}, etc.
        if len(parts) >= 3 and parts[0] == "api" and parts[1] in {"dashboard", "simulate", "upload", "events", "alerts"}:
            return parts[-1]
        return None

    try:
        if status in (401, 403, 429):
            log_audit_event(
                user_id=_guess_user_id(),
                event_type="rate_limited" if status == 429 else "auth_denied",
                method=method,
                path=path,
                status_code=status,
                client_ip=request.client.host if request.client else None,
            )
        elif method in _MUTATING_METHODS and 200 <= status < 300 and path.startswith("/api/"):
            log_audit_event(
                user_id=_guess_user_id(),
                event_type="mutation",
                method=method,
                path=path,
                status_code=status,
                client_ip=request.client.host if request.client else None,
            )
    except Exception:  # noqa: BLE001 - audit logging must never break a response
        pass

    return response
