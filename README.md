# FinPilot — AI Financial Health Copilot

An AI copilot that consolidates accounts, cards, loans, investments and transaction history into one financial-health view: it detects spending patterns, recurring obligations, debt pressure, and upcoming cash-flow gaps, answers natural-language questions conversationally, and shows the **expected impact** of every recommendation — with observed facts, model predictions, and recommendations clearly separated and confidence shown wherever data is incomplete.

## Stack

- **Backend**: FastAPI (Python), Postgres via Supabase, Google Gemini (function calling) for the conversational copilot
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts
- **Auth/DB**: Supabase (Google OAuth + Postgres + RLS)
- **Design**: monochrome "Brex"-style system with a single Ember accent (see `/plans` for full token spec)

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

### Known gaps
- The API layer currently serves a single fixture snapshot
  (`demo_dashboard_snapshot`) rather than real per-user DB-backed state —
  this is what the in-progress DB integration work replaces.
- The 3 demo personas (below) exist as backend seed data and are directly
  reachable via `user_id` on every API route (e.g.
  `/api/dashboard/demo-arjun`), but the frontend has no persona switcher yet
  — it always shows `demo-priya`.

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
