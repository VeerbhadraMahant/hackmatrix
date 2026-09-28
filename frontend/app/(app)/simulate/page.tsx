"use client";

import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import type { ActionType, RecurringObligation, SimulationResult } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { formatCurrency, formatImpactValue } from "@/lib/format";

type ScenarioKind = "cancel_subscription" | "prepay_debt" | "increase_sip";

const SCENARIOS: { kind: ScenarioKind; label: string; action: ActionType }[] = [
  { kind: "cancel_subscription", label: "Cancel a subscription", action: "cancel_subscription" },
  { kind: "prepay_debt", label: "Prepay a debt", action: "prepay_debt" },
  { kind: "increase_sip", label: "Increase SIP", action: "increase_sip" },
];

export default function SimulatePage() {
  const userId = useUserId();
  const [scenario, setScenario] = useState<ScenarioKind>("cancel_subscription");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [debtId, setDebtId] = useState<string | null>(null);
  const [extraAmount, setExtraAmount] = useState(2000);

  const fetchDashboard = useCallback(() => api.dashboard(userId), [userId]);
  const { data: dashboard } = useAsync(fetchDashboard, [userId]);

  const firstSubscription = dashboard?.recurring_obligations.find((o) => o.category === "subscriptions");
  const activeGroupId = groupId ?? firstSubscription?.group_id ?? null;
  const activeDebtId = debtId ?? dashboard?.debts[0]?.id ?? null;

  const actionParams = useMemo(() => {
    if (scenario === "cancel_subscription") return { group_ids: activeGroupId ? [activeGroupId] : [] };
    if (scenario === "prepay_debt") return { debt_id: activeDebtId, extra_payment: extraAmount };
    // ActionType.increase_sip's handler (backend/app/simulate/engine.py
    // _do_increase_sip) reads params["amount"], not "extra_monthly_amount" --
    // sending the wrong key silently simulated a ₹0/month SIP increase.
    return { amount: extraAmount };
  }, [scenario, activeGroupId, activeDebtId, extraAmount]);

  const canRun =
    (scenario !== "cancel_subscription" || !!activeGroupId) &&
    (scenario !== "prepay_debt" || !!activeDebtId);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A subscription/debt picked for one persona doesn't exist (or means
  // something different) for another -- switching via the NavShell persona
  // switcher must not silently reuse a stale selection or a stale result
  // from the previous persona's run. Reset during render (React's
  // recommended pattern for "state depends on a prop") rather than in an
  // effect, which would cause an extra render with stale data flashing first.
  const [lastUserId, setLastUserId] = useState(userId);
  if (userId !== lastUserId) {
    setLastUserId(userId);
    setGroupId(null);
    setDebtId(null);
    setResult(null);
    setError(null);
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const action = SCENARIOS.find((s) => s.kind === scenario)!.action;
      const res = await api.simulate(userId, { action, action_params: actionParams });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Simulate</h1>
        <p className="mt-1 text-sm text-graphite">
          Preview the impact of a change before you make it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <Button
            key={s.kind}
            variant={scenario === s.kind ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              setScenario(s.kind);
              setResult(null);
            }}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card className="flex flex-col gap-4">
        {scenario === "cancel_subscription" && (
          <SubscriptionPicker
            obligations={dashboard?.recurring_obligations ?? []}
            selected={activeGroupId}
            onSelect={setGroupId}
          />
        )}

        {scenario === "prepay_debt" && (
          <div className="flex flex-col gap-3">
            <label htmlFor="simulate-debt-select" className="text-sm font-medium text-ink">
              Debt
            </label>
            <select
              id="simulate-debt-select"
              className="rounded-chip border border-mist px-3 py-2 text-sm"
              value={activeDebtId ?? ""}
              onChange={(e) => setDebtId(e.target.value)}
            >
              {(dashboard?.debts ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {formatCurrency(d.principal)} principal &middot; {d.interest_rate_apr.toFixed(1)}% APR
                </option>
              ))}
            </select>
            <AmountSlider label="Extra monthly payment" value={extraAmount} onChange={setExtraAmount} max={20000} />
          </div>
        )}

        {scenario === "increase_sip" && (
          <AmountSlider label="Additional monthly SIP" value={extraAmount} onChange={setExtraAmount} max={20000} />
        )}

        <Button variant="primary" onClick={run} disabled={!canRun || running} className="self-start">
          {running ? "Running..." : "Run simulation"}
        </Button>
        {error && <p className="text-sm text-ink">{error}</p>}
      </Card>

      {result && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Impact</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <ImpactStat label="Health score" before={result.health_score_before} after={result.health_score_after} />
              <Chip tone="accent">{Math.round(result.confidence * 100)}% confidence</Chip>
            </div>
            <div className="mt-4 rounded-chip border border-mist p-4">
              <p className="text-sm text-graphite">{result.impact.metric}</p>
              <div className="mt-1 flex items-center gap-2 text-lg">
                <span className="text-pewter">{formatImpactValue(result.impact.metric, result.impact.before)}</span>
                <span className="text-mist">&rarr;</span>
                <span className="font-semibold text-ink">{formatImpactValue(result.impact.metric, result.impact.after)}</span>
                <span className="font-semibold text-ember-dark">
                  ({result.impact.delta >= 0 ? "+" : ""}
                  {formatImpactValue(result.impact.metric, result.impact.delta)})
                </span>
              </div>
              <p className="mt-1 text-xs text-pewter">Over {result.impact.horizon}</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Forecast: before vs after</CardTitle>
            </CardHeader>
            <ForecastChart forecast={result.forecast_after} compareForecast={result.forecast_before} compareLabel="Before" />
          </Card>
        </div>
      )}
    </div>
  );
}


function ImpactStat({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-pewter">{label}:</span>
      <span className="text-graphite">{Math.round(before)}</span>
      <span className="text-mist">&rarr;</span>
      <span className="font-display text-2xl text-ink">{Math.round(after)}</span>
      <span className={delta >= 0 ? "text-sm font-semibold text-ember-dark" : "text-sm font-semibold text-ink"}>
        ({delta >= 0 ? "+" : ""}
        {Math.round(delta)})
      </span>
    </div>
  );
}

function SubscriptionPicker({
  obligations,
  selected,
  onSelect,
}: {
  obligations: RecurringObligation[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (obligations.length === 0) {
    return <p className="text-sm text-pewter">No recurring obligations found for this account.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Subscription to cancel</label>
      <div className="flex flex-col gap-2">
        {obligations
          .filter((o) => o.category === "subscriptions")
          .map((o) => (
            <button
              key={o.group_id}
              onClick={() => onSelect(o.group_id)}
              className={
                "flex items-center justify-between rounded-chip border px-3 py-2 text-left text-sm " +
                (selected === o.group_id ? "border-ink bg-fog" : "border-mist hover:bg-fog")
              }
            >
              <span>{o.merchant}</span>
              <span className="font-medium">{formatCurrency(Math.abs(o.amount))}/mo</span>
            </button>
          ))}
      </div>
    </div>
  );
}

function AmountSlider({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-sm font-semibold text-ink">{formatCurrency(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={500}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ember"
      />
    </div>
  );
}
