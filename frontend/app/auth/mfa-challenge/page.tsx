"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Shown when a signed-in user has a verified TOTP factor enrolled but this
 * session hasn't completed it yet (AAL1, "nextLevel" says AAL2 is required).
 * proxy.ts redirects here; there is nothing to do for users who never
 * enrolled a factor (their session is already at the level it needs to be).
 */
export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (!verified) {
        // No factor to challenge -- nothing gates this session, send them on.
        router.replace("/dashboard");
        return;
      }
      setFactorId(verified.id);
    })();
  }, [router]);

  async function verify() {
    if (!factorId || code.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code -- try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-fog px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl text-ink">Enter your code</h1>
        <p className="mt-1 text-sm text-graphite">
          Open your authenticator app and enter the 6-digit code to finish signing in.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            autoFocus
            className="rounded-chip border border-mist px-3 py-2 text-sm outline-none focus:border-ink"
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          <Button variant="primary" onClick={verify} disabled={busy || code.length !== 6}>
            Verify
          </Button>
          {error && <p className="text-sm text-ink">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
