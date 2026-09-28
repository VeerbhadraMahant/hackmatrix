"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignInButton } from "@/components/SignInButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/copilot", label: "Copilot" },
  { href: "/simulate", label: "Simulate" },
  { href: "/timeline", label: "Timeline" },
];

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
          <SignInButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
