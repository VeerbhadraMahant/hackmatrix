"use client";

/**
 * Per-viewer demo user id. The backend seeds three demo personas
 * (demo-priya, demo-arjun, demo-meera -- see backend/app/ingest/personas.py)
 * and every client-side call defaults to demo-priya. Stored in localStorage
 * purely as a per-viewer convenience (never read by the server) -- swapped
 * for the real Supabase user id once accounts map to backend user records.
 */
const STORAGE_KEY = "finpilot:user_id";
export const DEFAULT_USER_ID = "demo-priya";

/** Fired on `window` whenever setUserId changes the active persona, so
 * useUserId() (lib/hooks.ts) can re-render and dependent useAsync() fetches
 * re-run -- see the persona switcher in components/NavShell.tsx. */
export const USER_ID_CHANGE_EVENT = "finpilot:user_id_changed";

export interface DemoPersona {
  id: string;
  label: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { id: "demo-priya", label: "Priya" },
  { id: "demo-arjun", label: "Arjun" },
  { id: "demo-meera", label: "Meera" },
];

export function getUserId(): string {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

export function setUserId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore -- private browsing / blocked storage
  }
  window.dispatchEvent(new CustomEvent(USER_ID_CHANGE_EVENT));
}
