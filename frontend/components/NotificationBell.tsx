"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { NotificationItem, NotificationSeverity } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Self-contained bell + dropdown -- takes only userId, ready for NavShell to
 * drop in as a single line. No read/unread state exists yet server-side, so
 * the badge is just the total count (capped at 9+).
 */
export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => api.notifications(userId), [userId]);
  const { data, error, loading } = useAsync(fetchNotifications, [userId]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const count = data?.length ?? 0;
  const badgeLabel = count > 9 ? "9+" : String(count);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-chip border border-mist text-graphite hover:bg-fog"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-semibold text-paper">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-surface border border-mist bg-paper shadow-float">
          <div className="border-b border-mist px-4 py-3">
            <p className="text-sm font-medium text-ink">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && !data && <p className="p-4 text-sm text-pewter">Loading...</p>}
            {error && <p className="p-4 text-sm text-ink">Could not load notifications.</p>}
            {data && data.length === 0 && <p className="p-4 text-sm text-pewter">You&apos;re all caught up.</p>}
            {data && data.length > 0 && (
              <ul className="flex flex-col divide-y divide-mist">
                {data.map((item) => (
                  <NotificationRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function severityDotClass(severity: NotificationSeverity): string {
  if (severity === "critical") return "bg-ember";
  if (severity === "warning") return "bg-graphite";
  return "bg-steel";
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityDotClass(item.severity))} />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-ink">{item.text}</p>
        <p className="text-xs text-pewter">{formatDate(item.date)}</p>
      </div>
    </li>
  );
}
