from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.db import init_db


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
