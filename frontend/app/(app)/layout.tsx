import type { ReactNode } from "react";
import { NavShell } from "@/components/NavShell";

/**
 * Shell for the authed app routes (dashboard/copilot/simulate/timeline).
 * Deliberately does NOT hard-block on auth: the "Try demo" path uses
 * user_id="demo-priya" client-side (see lib/user.ts) and always works, even
 * if Supabase OAuth isn't configured in a given environment. Real sign-in is
 * additive, not a gate, which keeps the hackathon demo resilient.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <NavShell>{children}</NavShell>;
}
