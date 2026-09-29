"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignInButton } from "@/components/SignInButton";
import { NotificationBell } from "@/components/NotificationBell";
import { useUserId } from "@/lib/hooks";
import { DEMO_PERSONAS, setUserId } from "@/lib/user";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/goals", label: "Goals" },
  { href: "/copilot", label: "Copilot" },
  { href: "/simulate", label: "Simulate" },
  { href: "/timeline", label: "Timeline" },
  { href: "/security", label: "Security" },
];

/** Segmented control for switching between the seeded demo personas. Calling
 * setUserId() updates localStorage and fires USER_ID_CHANGE_EVENT, which
 * useUserId() (lib/hooks.ts) picks up so every page currently mounted
 * re-renders and refetches with the newly selected persona. */
function PersonaSwitcher() {
  const userId = useUserId();

  return (
    <div
      role="radiogroup"
      aria-label="Demo persona"
      className="flex items-center gap-0.5 rounded-chip border border-mist bg-paper p-0.5"
    >
      {DEMO_PERSONAS.map((persona) => {
        const active = userId === persona.id;
        return (
          <button
            key={persona.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setUserId(persona.id)}
            className={cn(
              "rounded-chip px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-fog text-ink" : "text-graphite hover:text-ink"
            )}
          >
            {persona.label}
          </button>
        );
      })}
    </div>
  );
}

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const userId = useUserId();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-mist">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-4 py-4 sm:px-8">
          <Link href="/dashboard" className="font-display text-lg text-ink">
            FinPilot
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-chip px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                    active ? "bg-fog text-ink" : "text-graphite hover:bg-fog"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <PersonaSwitcher />
          <NotificationBell userId={userId} />
          <SignInButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
