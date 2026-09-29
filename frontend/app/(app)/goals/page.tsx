"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import type { GoalProgress } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { formatCurrency, formatDate } from "@/lib/format";

export default function GoalsPage() {
  const userId = useUserId();
  const fetchGoals = useCallback(() => api.goals(userId), [userId]);
  const { data, error, loading, reload } = useAsync(fetchGoals, [userId]);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    const amount = Number(targetAmount);
    if (!name.trim()) {
      setCreateError("Give the goal a name.");
      return;
    }
    if (!amount || amount <= 0) {
      setCreateError("Enter a target amount greater than zero.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.createGoal(userId, {
        name: name.trim(),
        target_amount: amount,
        target_date: targetDate || undefined,
      });
      setName("");
      setTargetAmount("");
      setTargetDate("");
      reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create goal");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Goals</h1>
        <p className="mt-1 text-sm text-graphite">Track progress toward what you&apos;re saving for.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New goal</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1">
            <label htmlFor="goal-name" className="text-xs text-pewter">
              Name
            </label>
            <input
              id="goal-name"
              type="text"
              placeholder="Emergency fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-chip border border-mist px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-amount" className="text-xs text-pewter">
              Target amount
            </label>
            <input
              id="goal-amount"
              type="number"
              min={0}
              placeholder="100000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-36 rounded-chip border border-mist px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-date" className="text-xs text-pewter">
              Target date (optional)
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-chip border border-mist px-3 py-2 text-sm text-graphite"
            />
          </div>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Adding..." : "Add goal"}
          </Button>
        </div>
        {createError && <p className="mt-2 text-sm text-ink">{createError}</p>}
      </Card>

      {loading && !data && <p className="text-sm text-pewter">Loading goals...</p>}

      {error && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-ink">Could not load goals: {error}</p>
          <Button variant="secondary" size="sm" onClick={reload} className="self-start">
            Retry
          </Button>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card>
          <p className="text-sm text-pewter">No goals yet. Add one above to start tracking progress.</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {data.map((gp) => (
            <GoalCard key={gp.goal.id} progress={gp} userId={userId} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ progress, userId, onChanged }: { progress: GoalProgress; userId: string; onChanged: () => void }) {
  const { goal, monthly_contribution, projected_completion_date, on_track, months_remaining } = progress;
  const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;

  const [contribution, setContribution] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleContribute() {
    const amount = Number(contribution);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await api.updateGoal(userId, goal.id, { current_amount: goal.current_amount + amount });
      setContribution("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteGoal(userId, goal.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{goal.name}</p>
          <p className="text-xs text-pewter">
            {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <Chip tone={on_track ? "outline" : "accent"}>{on_track ? "On track" : "Behind"}</Chip>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-chip bg-fog">
        <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-pewter">
        <p>Monthly contribution: {formatCurrency(monthly_contribution)}</p>
        <p>{months_remaining !== null ? `${months_remaining} months remaining` : "No projection yet"}</p>
        <p className="col-span-2">
          {projected_completion_date
            ? `Projected completion: ${formatDate(projected_completion_date)}`
            : goal.target_date
              ? `Target date: ${formatDate(goal.target_date)}`
              : "No target date set"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-mist pt-3">
        <input
          type="number"
          min={0}
          placeholder="Add contribution"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          className="w-36 rounded-chip border border-mist px-3 py-1.5 text-sm"
        />
        <Button variant="secondary" size="sm" onClick={handleContribute} disabled={saving}>
          {saving ? "Saving..." : "Add"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="ml-auto">
          {deleting ? "Deleting..." : "Delete goal"}
        </Button>
      </div>
    </Card>
  );
}
