"use client";

/**
 * Per-viewer demo user id. The hackathon backend currently only has fixture
 * data for "demo-priya", so every client-side call defaults to it. Stored in
 * localStorage purely as a per-viewer convenience (never read by the
 * server) -- swapped for the real Supabase user id once accounts map to
 * backend user records.
 */
const STORAGE_KEY = "finpilot:user_id";
export const DEFAULT_USER_ID = "demo-priya";

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
}
