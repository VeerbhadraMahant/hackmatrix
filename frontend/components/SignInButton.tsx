"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { setAuthUserId } from "@/lib/user";

/**
 * Real "Sign in with Google" via Supabase OAuth. The demo path (see
 * app/(app)/layout.tsx) never depends on this succeeding -- if Supabase env
 * vars aren't configured in a given environment, this button simply surfaces
 * the error instead of blocking the rest of the app. Once signed in, shows
 * the account email with a Sign out action instead.
 */
export function SignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      // Fires immediately with the stored session (INITIAL_SESSION), then on
      // every sign-in/out. Also tells the app whose data to load.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null);
        setAuthUserId(session?.user?.id ?? null);
      });
      return () => sub.subscription.unsubscribe();
    } catch {
      // Supabase not configured -- stay on the signed-out button.
    }
  }, []);

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

  async function handleSignOut() {
    await createClient().auth.signOut();
  }

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-40 truncate text-xs text-graphite" title={email}>
          {email}
        </span>
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    );
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
