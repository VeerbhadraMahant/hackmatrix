"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/hooks";
import type { RecomputeDiff } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { formatDate } from "@/lib/format";

type EventKind = "transaction" | "recurring";

/**
 * Add a one-off transaction or a new recurring obligation, then render the
 * backend's RecomputeDiff -- this is the "how recommendations change as new
 * information arrives" demo. Kept deliberately simple: one form, one diff
 * card, no extra animation.
 */
export default function TimelinePage() {
  const userId = useUserId();
  const [kind, setKind] = useState<EventKind>("transaction");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState(1000);
  const [frequency, setFrequency] = useState("monthly");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [diff, setDiff] = useState<RecomputeDiff | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDiff(null);
    try {
      const payload =
        kind === "transaction"
          ? { kind: "transaction", merchant, amount, date }
          : { kind: "recurring", merchant, amount, frequency, next_expected_date: date };
      const result = await api.addEvent(userId, payload);
      setDiff(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Timeline</h1>
        <p className="mt-1 text-sm text-graphite">
          Add a new transaction or obligation and see how your outlook changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add event</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button type="button" variant={kind === "transaction" ? "primary" : "secondary"} size="sm" onClick={() => setKind("transaction")}>
              One-off transaction
            </Button>
            <Button type="button" variant={kind === "recurring" ? "primary" : "secondary"} size="sm" onClick={() => setKind("recurring")}>
              New recurring obligation
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Merchant / description">
              <input
                required
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="rounded-chip border border-mist px-3 py-2 text-sm"
                placeholder="e.g. Netflix"
              />
            </Field>
            <Field label="Amount">
              <input
                required
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="rounded-chip border border-mist px-3 py-2 text-sm"
              />
            </Field>
            {kind === "recurring" && (
              <Field label="Frequency">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="rounded-chip border border-mist px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
            )}
            <Field label={kind === "transaction" ? "Date" : "Next expected date"}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-chip border border-mist px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Button type="submit" variant="primary" disabled={submitting} className="self-start">
            {submitting ? "Recomputing..." : "Add and recompute"}
          </Button>
          {error && <p className="text-sm text-ink">{error}</p>}
        </form>
      </Card>

      {diff && <DiffCard diff={diff} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-pewter">{label}</span>
      {children}
    </label>
  );
}

function DiffCard({ diff }: { diff: RecomputeDiff }) {
  const scoreDelta = diff.health_score_after - diff.health_score_before;
  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>What changed</CardTitle>
      </CardHeader>
      {diff.narrative && <p className="text-sm text-graphite">{diff.narrative}</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-pewter">Health score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-graphite">{Math.round(diff.health_score_before)}</span>
            <span className="text-mist">&rarr;</span>
            <span className="font-display text-3xl text-ink">{Math.round(diff.health_score_after)}</span>
            <span className={scoreDelta >= 0 ? "text-sm font-semibold text-ember-dark" : "text-sm font-semibold text-ink"}>
              ({scoreDelta >= 0 ? "+" : ""}
              {Math.round(scoreDelta)})
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-pewter">Projected shortfall</p>
          <div className="mt-1 flex items-baseline gap-2 text-sm">
            <span className="text-graphite">
              {diff.forecast_first_gap_before ? formatDate(diff.forecast_first_gap_before) : "None"}
            </span>
            <span className="text-mist">&rarr;</span>
            <span className="font-semibold text-ink">
              {diff.forecast_first_gap_after ? formatDate(diff.forecast_first_gap_after) : "None"}
            </span>
          </div>
        </div>
      </div>

      {diff.new_recommendations.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-pewter">New recommendations</p>
          <ul className="mt-2 flex flex-col gap-2">
            {diff.new_recommendations.map((r, i) => (
              <li key={i} className="rounded-chip border border-mist p-3 text-sm text-ink">
                {r.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {diff.removed_recommendation_actions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-pewter">No longer recommended</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {diff.removed_recommendation_actions.map((a, i) => (
              <Chip key={i} tone="outline">
                {a.replace(/_/g, " ")}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
