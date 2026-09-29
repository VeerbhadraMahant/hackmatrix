# FinPilot — AI Financial Health Copilot

An AI copilot that consolidates accounts, cards, loans, investments and transaction history into one financial-health view: it detects spending patterns, recurring obligations, debt pressure, and upcoming cash-flow gaps, answers natural-language questions conversationally, and shows the **expected impact** of every recommendation — with observed facts, model predictions, and recommendations clearly separated and confidence shown wherever data is incomplete.

## Stack

- **Backend**: FastAPI (Python), Postgres via Supabase, Google Gemini (function calling) for the conversational copilot
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts
- **Auth/DB**: Supabase (Google OAuth + Postgres + RLS)
- **Design**: monochrome "Brex"-style system with a single Ember accent (tokens in `frontend/app/globals.css`)

## Getting started

### Backend
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Reads secrets from `../.env.local` or `backend/.env` (see `.env.example`). Runs fully offline (SQLite + rule-based copilot fallback) with no keys set.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Reads secrets from `frontend/.env.local` (see `.env.example`).

### Database
Migrations live in `supabase/migrations/`. Apply with the Supabase CLI:
```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Repository layout
```
backend/app/    ingest, analytics, forecast, simulate, recommend, copilot, api
frontend/app/   dashboard, copilot chat, what-if simulator, timeline
supabase/       SQL migrations (RLS-scoped per user)
```

## What's implemented

- **Analytics**: health score (5 weighted sub-scores), savings rate,
  emergency-fund coverage, debt-to-income + avalanche/snowball payoff
  comparison, recurring-obligation + redundant-subscription detection,
  anomaly detection, income-bracket benchmarking, goal projection.
- **Forecast**: a 90-day P10/P50/P90 cash-flow forecast, bootstrap-resampled
  from real spend history when enough is available, with a clearly-labeled
  widening-band approximation as the fallback, plus first-projected-gap
  detection and an explicit confidence score.
- **Simulate**: what-if engine covering 8 action types (cancel a
  subscription, reduce category spend, prepay/refinance a debt, increase a
  SIP, build an emergency fund, check affordability, shift a payment date),
  each returning a real before/after forecast and a populated impact
  estimate — never a placeholder.
- **Recommend**: generates candidate actions from the user's actual debts,
  subscriptions and forecast, ranks them by simulated impact × confidence.
- **Copilot**: a Gemini function-calling chat engine (grounds every number in
  a real tool call, two-phase structured output) with a zero-dependency
  rule-based offline router as an automatic fallback when no Gemini key is
  configured or a call fails — `backend/app/copilot/eval.py` runs a 26-question
  eval set against the offline router.
- **Frontend**: dashboard (health score, forecast chart, recurring
  obligations, debts, insights), copilot chat, what-if simulator, and a
  timeline page that adds an event and shows the resulting before/after
  diff. Every insight is rendered as three explicitly labeled lanes —
  Observed / Predicted / Recommended — never blended into one paragraph.
- **Ingest**: CSV/JSON bank-statement upload with flexible column/date/amount
  parsing, merchant categorization (rules + optional Gemini-embedding
  fallback), and synthetic 12-month transaction generators for 3 demo
  personas.
- **Integration**: `/api/dashboard/{user_id}` and every other route compute
  a real per-user snapshot from the database (accounts, transactions, debts)
  end to end through analytics → forecast → recommend, cached in
  `insights_snapshots` for before/after diffing. Unknown/unseeded users fall
  back to a static fixture so the app never 500s. `/api/events/{user_id}`
  persists a new transaction and returns a genuine before/after
  `RecomputeDiff` (health score, forecast gap date, recommendation changes).

### Known gaps
- `/api/events` supports adding a one-off transaction or a new recurring
  obligation (`kind: "transaction"` / `"recurring"`); adding a new income
  source or debt as a timeline event isn't wired up yet.
- Rate limiting (see Security below) is in-memory/single-process; a
  multi-instance production deployment should move it to a shared store.

## Security

FinPilot handles financial data, so security got a dedicated pass rather than
being an afterthought:

- **Authentication is enforced on every API route.** Every endpoint that
  takes a `user_id` verifies a real Supabase-issued access token locally
  against the project's JWKS (`backend/app/core/auth.py`) and requires the
  token's verified subject to match the requested `user_id` — a signed-in
  user cannot read or mutate another user's data by changing a URL. The 3
  seeded demo personas remain reachable with no token, by design: they're
  fixed public fixture data meant for trying the app without signing in.
- **Row-level security** is enabled on every Postgres table
  (`auth.uid() = user_id`), scoped per user.
- **Two-factor authentication**: a real TOTP second factor (`/security`
  page) via Supabase's native MFA, independent of the Google OAuth
  provider — authenticator-app enrollment with a QR code, gated behind a
  challenge screen at sign-in. (Separately: if your Google account already
  has 2-Step Verification on, signing in with Google already requires it
  before FinPilot ever sees a token.)
- **Rate limiting** on `/api/chat` (30/hour) and `/api/upload` (10/hour) to
  protect the Gemini API key from abuse and the CSV parser from being
  hammered.
- **CSV upload hardening**: 5MB file-size cap and 20,000-row cap to prevent
  resource-exhaustion.
- **CORS** locked to `localhost`/`127.0.0.1` in dev; production origins must
  be set explicitly via `ALLOWED_ORIGINS` (fails closed if unset).
- **Third-party data disclosure**: when the copilot uses Gemini, a summary
  of relevant financial data is sent to Google's API to ground the answer.
  This is disclosed on the `/security` page, and an **offline-mode toggle**
  there forces every copilot answer through the local rule-based router
  instead, so nothing ever leaves the app for privacy-conscious users.
- **Audit trail**: every authentication denial and every successful
  data-mutating request is persisted to `audit_logs`
  (`backend/app/core/audit.py`), queryable per user via its own RLS policy.
- Secrets are never committed (`.env*` gitignored, verified absent from git
  history); the frontend only ever holds Supabase's anon key, never the
  service-role key.

**Documented, not (yet) implemented**: production-grade JWKS caching
across multiple backend instances (current caching is per-process);
Redis-backed rate limiting for horizontal scaling; field-level encryption
for any future sensitive fields beyond what Supabase's managed Postgres
already encrypts at rest.

## Demo personas
Seeded via `python -m app.ingest.seed` (from `backend/`), each with 12 months
of synthetic transaction history:

| `user_id` | Who | Profile |
|---|---|---|
| `demo-priya` | Priya, Bengaluru | ₹95k/mo salary, car loan + credit card debt at 42% APR, thin emergency fund |
| `demo-arjun` | Arjun, Mumbai | ₹160k/mo salary, home loan, two school-fee obligations, healthier savings |
| `demo-meera` | Meera, Pune | ₹42k/mo salary, shared PG rent, student loan, tight monthly cash flow |

## Example copilot questions
- "How am I doing financially?"
- "What's my savings rate?"
- "How much debt do I have?"
- "Is there a gap coming up in my cash flow?"
- "Can I afford a ₹60,000 phone next month?"
- "What should I do to improve my finances?"
- "What happens if I pay off my credit card faster?"

## Tests
```bash
cd backend
python -m pytest tests -q          # unit + API tests
python -m app.copilot.eval         # offline-router eval set
```

## Status
Under active development — see git history for progress.
