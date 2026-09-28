"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/**
 * Real "Sign in with Google" via Supabase OAuth. The demo path (see
 * app/(app)/layout.tsx) never depends on this succeeding -- if Supabase env
 * vars aren't configured in a given environment, this button simply surfaces
 * the error instead of blocking the rest of the app.
 */
export function SignInButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
    } catch {
      setError("Sign-in is not configured in this environment.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleSignIn}>
        Sign in with Google
      </Button>
      {error ? <span className="text-xs text-pewter">{error}</span> : null}
    </div>
  );
}
