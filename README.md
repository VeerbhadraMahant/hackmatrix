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

## Status
Under active development — see git history for progress.
