"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SignInButton } from "@/components/SignInButton";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FinPilotLogo } from "@/components/FinPilotLogo";
import { useUserId } from "@/lib/hooks";
import { DEMO_PERSONAS, isDemoUserId, setUserId } from "@/lib/user";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/goals", label: "Goals" },
  { href: "/copilot", label: "Copilot" },
  { href: "/simulate", label: "Simulate" },
  { href: "/tax", label: "Tax" },
  { href: "/timeline", label: "Timeline" },
  { href: "/statement", label: "Statement" },
  { href: "/security", label: "Security" },
];

const PERSONA_DETAILS: Record<string, { city: string; tag: string }> = {
  "demo-priya": { city: "Bengaluru", tag: "₹95k/mo" },
  "demo-arjun": { city: "Mumbai", tag: "₹160k/mo" },
  "demo-meera": { city: "Pune", tag: "₹42k/mo" },
};

/** Segmented control for switching between the seeded demo personas */
function PersonaSwitcher() {
  const userId = useUserId();
  // Signed-in users only see their own data -- no demo personas.
  if (!isDemoUserId(userId)) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Demo persona"
      className="flex items-center gap-1 rounded-full border border-mist bg-paper/70 p-1 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    >
      {DEMO_PERSONAS.map((persona) => {
        const active = userId === persona.id;
        const details = PERSONA_DETAILS[persona.id];
        return (
          <button
            key={persona.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setUserId(persona.id)}
            className={cn(
              "relative px-3 py-1.5 text-xs font-medium cursor-pointer rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5",
              active ? "text-ink font-semibold" : "text-graphite hover:text-ink"
            )}
          >
            {active && (
              <motion.div
                layoutId="active-persona-pill"
                className="absolute inset-0 rounded-full bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-mist"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-ember" : "bg-steel/50"
                )}
              />
              <span>{persona.label}</span>
              {details && (
                <span className="text-[10px] text-pewter font-normal hidden xl:inline">
                  {details.tag}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const userId = useUserId();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 glass-header">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          {/* Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="FinPilot Dashboard">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5 p-1 border border-mist shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-105 transition-transform">
              <FinPilotLogo size={24} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-medium tracking-tight text-ink">
                FinPilot
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse shadow-[0_0_6px_rgba(255,89,0,0.6)]" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-mist bg-fog/70 p-1 backdrop-blur-md">
            {LINKS.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
                    active ? "text-ink font-semibold" : "text-graphite hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-mist"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>
          {/* Right actions: Persona Switcher + Notification Bell + Sign In + Mobile Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden sm:block">
              <PersonaSwitcher />
            </div>
            <NotificationBell userId={userId} />
            <div className="hidden lg:block">
              <SignInButton />
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-chip border border-mist bg-paper text-ink hover:bg-fog transition-colors"
              aria-label="Toggle navigation menu"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-mist bg-paper/95 backdrop-blur-xl px-4 py-4 overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <div className="mb-2 pb-2 border-b border-mist sm:hidden">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-pewter block mb-1.5">
                    Demo Persona
                  </span>
                  <PersonaSwitcher />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LINKS.map((link) => {
                    const active = pathname?.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-chip font-medium text-center transition-colors",
                          active
                            ? "bg-ink text-paper font-semibold"
                            : "bg-fog text-graphite hover:text-ink"
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-mist">
                  <SignInButton />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-4 pb-28 sm:px-8 sm:py-10 md:pb-10 min-w-0">
        {children}
      </main>

      {/* Ergonomic Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
