"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getUserId, USER_ID_CHANGE_EVENT } from "@/lib/user";

function subscribeToUserIdChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(USER_ID_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(USER_ID_CHANGE_EVENT, onStoreChange);
}

/**
 * Returns the current demo/real user id. Uses useSyncExternalStore so the
 * server snapshot (SSR: no localStorage) and client snapshot can differ
 * without triggering the "setState inside effect" lint rule or a hydration
 * mismatch warning -- the id itself is never rendered into DOM text. The
 * persona switcher (components/NavShell.tsx) calls setUserId(), which
 * dispatches USER_ID_CHANGE_EVENT so every subscriber here re-renders with
 * the new id -- and any useAsync() keyed on userId refetches automatically.
 */
export function useUserId(): string {
  return useSyncExternalStore(subscribeToUserIdChanges, getUserId, () => "demo-priya");
}

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Minimal fetch-on-mount hook -- no react-query dependency needed for this scope. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    let cancelled = false;
    // Skip the redundant reset on the very first run -- initial state is
    // already {loading: true}; subsequent dep/tick changes do need it.
    if (!isFirstRun.current) {
      setState({ data: null, error: null, loading: true });
    }
    isFirstRun.current = false;

    fn()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ data: null, error: err instanceof Error ? err.message : "Something went wrong", loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
