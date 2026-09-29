import type {
  AnswerContract,
  DashboardSnapshot,
  RecomputeDiff,
  SimulationRequest,
  SimulationResult,
} from "./types";
import { createClient } from "./supabase/client";
import { getOfflineOnly } from "./user";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The backend now verifies a real Supabase session token for any user_id
 * that isn't one of the fixed demo personas (see backend/app/core/auth.py)
 * -- attach it whenever one exists. Demo-only usage (no signed-in session)
 * simply omits the header, which the backend already allows for the demo
 * personas. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    // Supabase env vars unset in this environment, or no session -- fall
    // back to unauthenticated (demo-only) requests rather than failing.
    return {};
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth, ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => apiFetch<{ status: string }>("/api/health"),
  dashboard: (userId: string) => apiFetch<DashboardSnapshot>(`/api/dashboard/${userId}`),
  // user_id must be threaded through explicitly -- ChatRequest defaults to
  // "demo-priya" server-side, so omitting it here would silently ignore
  // whatever persona the rest of the app (dashboard/simulate/timeline, all
  // of which use useUserId()) is currently showing.
  chat: (message: string, userId: string) =>
    apiFetch<AnswerContract>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, user_id: userId, force_offline: getOfflineOnly() }),
    }),
  simulate: (userId: string, req: SimulationRequest) =>
    apiFetch<SimulationResult>(`/api/simulate/${userId}`, { method: "POST", body: JSON.stringify(req) }),
  addEvent: (userId: string, payload: Record<string, unknown>) =>
    apiFetch<RecomputeDiff>(`/api/events/${userId}`, { method: "POST", body: JSON.stringify(payload) }),
};
