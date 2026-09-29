"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAsync } from "@/lib/hooks";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

type EnrollStep = "idle" | "enrolling" | "verifying";

async function loadSecurityState(): Promise<{ signedIn: boolean; factors: Factor[] }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { signedIn: false, factors: [] };
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return { signedIn: true, factors: (data?.totp ?? []) as Factor[] };
}

/**
 * Real two-factor auth via Supabase's native TOTP support -- independent of
 * whichever OAuth provider a user signed in with. This is opt-in per user
 * (enrolling here never affects anyone who doesn't visit this page), and it
 * only applies to a real signed-in session -- the "try demo" path has no
 * Supabase session at all, so there is nothing to protect there.
 */
export default function SecurityPage() {
  const { data, loading, reload } = useAsync(loadSecurityState, []);
  const session = loading ? "loading" : data?.signedIn ? "signed-in" : "signed-out";
  const factors = data?.factors ?? [];

  const [step, setStep] = useState<EnrollStep>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshFactors = useCallback(() => reload(), [reload]);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("enrolling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!factorId || code.trim().length !== 6) return;
    setError(null);
    setBusy(true);
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
      setStep("idle");
      setQrCode(null);
      setSecret(null);
      setCode("");
      await refreshFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code -- check your authenticator app and try again");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(id: string) {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      await refreshFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this method");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Security</h1>
        <p className="mt-1 text-sm text-graphite">
          Add a second factor so your financial data is protected even if your password or Google session is
          ever compromised.
        </p>
      </div>

      {session === "loading" && <p className="text-sm text-pewter">Checking your session...</p>}

      {session === "signed-out" && (
        <Card>
          <p className="text-sm text-graphite">
            Two-factor authentication applies to a real signed-in account. Sign in with Google from the nav bar
            first, then come back here to set it up.
          </p>
          <p className="mt-3 text-xs text-pewter">
            Note: if your Google account already has 2-Step Verification turned on, signing in with Google
            already requires it before FinPilot ever sees a token -- this page adds an independent second
            factor on top of that, so your account stays protected even if your Google session is not.
          </p>
        </Card>
      )}

      {session === "signed-in" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Authenticator app (TOTP)</CardTitle>
              {factors.length > 0 ? <Chip tone="accent">Enabled</Chip> : <Chip tone="outline">Not enabled</Chip>}
            </CardHeader>

            {factors.length > 0 && step === "idle" && (
              <div className="flex flex-col gap-3">
                {factors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-chip border border-mist px-4 py-3">
                    <div className="text-sm text-ink">
                      {f.friendly_name || "Authenticator app"}
                      <span className="ml-2 text-xs text-pewter">{f.status}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => unenroll(f.id)} disabled={busy}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {factors.length === 0 && step === "idle" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-graphite">
                  Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) to require a 6-digit
                  code every time you sign in.
                </p>
                <Button variant="primary" onClick={startEnroll} disabled={busy} className="self-start">
                  Set up authenticator app
                </Button>
              </div>
            )}

            {step === "enrolling" && qrCode && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-graphite">
                  Scan this code with your authenticator app, then enter the 6-digit code it shows.
                </p>
                {/* Supabase returns the QR as a data: URI; render via <img> rather than raw SVG injection. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="Scan with your authenticator app" className="h-48 w-48 self-start rounded-surface border border-mist" />
                {secret && (
                  <p className="text-xs text-pewter">
                    Can&apos;t scan? Enter this key manually: <span className="font-mono">{secret}</span>
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="totp-code" className="text-xs text-pewter">
                      6-digit code
                    </label>
                    <input
                      id="totp-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-32 rounded-chip border border-mist px-3 py-2 text-sm outline-none focus:border-ink"
                    />
                  </div>
                  <Button variant="primary" onClick={confirmEnroll} disabled={busy || code.length !== 6}>
                    Verify &amp; enable
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep("idle");
                      setQrCode(null);
                      setCode("");
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-ink">{error}</p>}
          </Card>

          <Card>
            <CardTitle>Data &amp; privacy</CardTitle>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-graphite">
              <li>
                Your account data is protected by Postgres row-level security -- every table enforces that only
                you can read or write your own rows.
              </li>
              <li>
                When you ask the copilot a question, a summary of your relevant financial data is sent to
                Google&apos;s Gemini API to generate the answer. If you&apos;d rather nothing leave this app,
                the copilot always has a fully offline fallback that never calls an external AI service.
              </li>
              <li>API access to your data requires a valid, matching sign-in token -- it is never inferred from a URL alone.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
