"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  Check,
  CheckCircle2,
  Clock,
  Home,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import type { GoalProgress } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GoalVisualMeta {
  icon: LucideIcon;
  accentColor: string;
  category: string;
}

function getGoalVisualMeta(name: string): GoalVisualMeta {
  const lower = name.toLowerCase();
  if (lower.includes("emergency") || lower.includes("runway") || lower.includes("safety") || lower.includes("shield")) {
    return { icon: ShieldCheck, accentColor: "#059669", category: "Financial Safety" };
  }
  if (lower.includes("loan") || lower.includes("debt") || lower.includes("credit") || lower.includes("avalanche")) {
    return { icon: Zap, accentColor: "#ff5900", category: "Debt Elimination" };
  }
  if (lower.includes("vacation") || lower.includes("travel") || lower.includes("trip") || lower.includes("holiday")) {
    return { icon: Plane, accentColor: "#0891b2", category: "Leisure & Travel" };
  }
  if (lower.includes("home") || lower.includes("house") || lower.includes("flat") || lower.includes("down payment")) {
    return { icon: Home, accentColor: "#4f46e5", category: "Long-Term Wealth" };
  }
  if (lower.includes("car") || lower.includes("bike") || lower.includes("vehicle")) {
    return { icon: Car, accentColor: "#d97706", category: "Major Purchase" };
  }
  return { icon: Target, accentColor: "#ff5900", category: "Wealth Horizon" };
}

const GOAL_TEMPLATES = [
  { name: "6-Month Emergency Runway", amount: 300000 },
  { name: "Home Down Payment Fund", amount: 1500000 },
  { name: "Annual Vacation Fund", amount: 120000 },
];

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
      setCreateError("Give the goal a descriptive name.");
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

  function handleSelectTemplate(tpl: { name: string; amount: number }) {
    setName(tpl.name);
    setTargetAmount(String(tpl.amount));
    if (createError) setCreateError(null);
  }

  const goals = data ?? [];

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Editorial Fraunces Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/[0.04]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Wealth Horizons
            </span>
            <span className="text-xs text-pewter font-medium">• Automated Goal Milestones</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink mt-1.5 tracking-tight">
            Savings Goals & Milestones
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-graphite max-w-2xl leading-relaxed">
            Define capital targets, track automated SIP allocations, and inspect milestone projections with dynamic pace telemetry.
          </p>
        </div>
      </div>

      {/* New Goal Creation Card */}
      <Card className="p-6">
        <CardHeader className="mb-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-base font-semibold text-ink">Set New Financial Goal</CardTitle>
              <p className="text-xs text-graphite mt-0.5">
                Establish an aspirational or defensive target with projected completion milestones.
              </p>
            </div>
            <span className="text-xs font-semibold text-pewter uppercase tracking-wider">
              {goals.length} Goals Active
            </span>
          </div>
        </CardHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <label htmlFor="goal-name" className="text-xs font-medium text-graphite">
                Goal Name
              </label>
              <input
                id="goal-name"
                type="text"
                placeholder="e.g. 6-Month Emergency Runway"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                className="w-full rounded-chip border border-mist bg-white px-3 py-2 text-sm text-ink placeholder:text-pewter focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember"
              />
            </div>

            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <label htmlFor="goal-amount" className="text-xs font-medium text-graphite">
                Target Amount (₹)
              </label>
              <input
                id="goal-amount"
                type="number"
                min={0}
                placeholder="e.g. 500000"
                value={targetAmount}
                onChange={(e) => {
                  setTargetAmount(e.target.value);
                  if (createError) setCreateError(null);
                }}
                className="w-full rounded-chip border border-mist bg-white px-3 py-2 text-sm text-ink placeholder:text-pewter focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember tnum"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label htmlFor="goal-date" className="text-xs font-medium text-graphite">
                Target Date (Optional)
              </label>
              <input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-chip border border-mist bg-white px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember"
              />
            </div>
          </div>

          {/* Quick Starter Templates */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-pewter font-medium">Starter Blueprints:</span>
              {GOAL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium text-graphite bg-fog border border-mist hover:bg-white hover:text-ink hover:border-black/[0.12] transition-colors cursor-pointer"
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={creating}
              className="h-10 text-xs font-semibold px-5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{creating ? "Adding..." : "Add Goal"}</span>
            </Button>
          </div>

          {createError && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-2 rounded-chip border border-rose-200">
              {createError}
            </p>
          )}
        </div>
      </Card>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6 flex flex-col gap-4 animate-pulse">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="flex flex-col gap-3 border-rose-200 bg-rose-50/30 p-6">
          <p className="text-sm font-semibold text-rose-800">Could not load goals: {error}</p>
          <Button variant="secondary" size="sm" onClick={reload} className="self-start text-xs">
            Retry Loading
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {goals.length === 0 && !loading && (
        <Card className="p-8">
          <EmptyState
            icon={<Target className="h-10 w-10 text-pewter" />}
            title="No savings goals yet"
            body="Start mapping your financial milestones by adding an emergency fund, major purchase, or retirement target above."
          />
        </Card>
      )}

      {/* Goals Grid */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((gp) => (
            <TactileGoalCard key={gp.goal.id} progress={gp} userId={userId} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function TactileGoalCard({
  progress,
  userId,
  onChanged,
}: {
  progress: GoalProgress;
  userId: string;
  onChanged: () => void;
}) {
  const { goal, monthly_contribution, projected_completion_date, on_track, months_remaining } = progress;
  const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
  const remainingGap = Math.max(0, goal.target_amount - goal.current_amount);

  const [contribution, setContribution] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const visual = getGoalVisualMeta(goal.name);
  const VisualIcon = visual.icon;

  async function handleContribute(customAmount?: number) {
    const amount = customAmount ?? Number(contribution);
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

  // Dynamic Pace Projection Logic
  let paceProjectionText = "";
  if (projected_completion_date && goal.target_date) {
    const projDate = new Date(projected_completion_date);
    const tgtDate = new Date(goal.target_date);
    const monthsDiff = Math.round((tgtDate.getTime() - projDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

    if (monthsDiff > 0) {
      paceProjectionText = `At current savings pace, on track to reach by ${formatDate(projected_completion_date)} (${monthsDiff} mo ahead of target)`;
    } else if (monthsDiff === 0) {
      paceProjectionText = `At current savings pace, on track to reach by ${formatDate(projected_completion_date)} (right on target)`;
    } else {
      paceProjectionText = `Projected completion ${formatDate(projected_completion_date)} (${Math.abs(monthsDiff)} mo behind target)`;
    }
  } else if (projected_completion_date) {
    paceProjectionText = `At current pace (${formatCurrency(monthly_contribution)}/mo), on track to reach by ${formatDate(projected_completion_date)}`;
  } else if (months_remaining !== null) {
    paceProjectionText = `${months_remaining} months remaining at current savings pace`;
  } else {
    paceProjectionText = "No regular contribution velocity recorded yet";
  }

  return (
    <Card
      hoverable
      className="p-5 sm:p-6 rounded-card border border-black/[0.08] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)] hover:border-black/[0.14] transition-all flex flex-col justify-between gap-5 relative group"
    >
      {/* Top Row: Thumbnail + Title + Current vs Target */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border text-white shadow-xs shrink-0"
            style={{ backgroundColor: visual.accentColor, borderColor: "rgba(0,0,0,0.06)" }}
          >
            <VisualIcon className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pewter">
                {visual.category}
              </span>
            </div>
            <h4 className="text-base font-semibold text-ink leading-snug">
              {goal.name}
            </h4>
            <p className="text-xs text-pewter mt-0.5">
              {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : "Open-ended horizon"}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <Chip
            tone={on_track ? "success" : "warning"}
            className="text-xs font-semibold mb-1"
          >
            {on_track ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                On Track
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-0.5" />
                Pace Needed
              </>
            )}
          </Chip>
        </div>
      </div>

      {/* Progress Bar Container with Milestones (25%, 50%, 75%, 100%) */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full h-3 rounded-full bg-fog overflow-hidden border border-black/[0.04]">
          {/* Milestone Tick Marks (25%, 50%, 75%) */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5 z-10">
            <span className="h-full w-0.5 bg-black/[0.1]" style={{ left: "25%", position: "absolute" }} />
            <span className="h-full w-0.5 bg-black/[0.1]" style={{ left: "50%", position: "absolute" }} />
            <span className="h-full w-0.5 bg-black/[0.1]" style={{ left: "75%", position: "absolute" }} />
          </div>

          {/* Animated Progress Fill with Shimmer Pulse */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            className="h-full rounded-full relative overflow-hidden"
            style={{ backgroundColor: visual.accentColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-pulse" />
          </motion.div>
        </div>

        {/* Milestone Labels Row */}
        <div className="flex justify-between items-center text-[10px] text-pewter font-medium px-0.5 select-none">
          <span>0%</span>
          <span className="hidden sm:inline">25%</span>
          <span className="font-semibold text-graphite">50% Midpoint</span>
          <span className="hidden sm:inline">75%</span>
          <span className="font-bold text-ink tnum">{pct}% Complete</span>
        </div>
      </div>

      {/* Metrics Row: Current, Target, Remaining Gap */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-surface bg-fog/60 border border-black/[0.04]">
        <div>
          <span className="text-[10px] font-medium text-pewter block uppercase tracking-wide">Current</span>
          <span className="font-display text-sm sm:text-base font-bold text-ink block tnum leading-tight mt-0.5">
            {formatCurrency(goal.current_amount)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-medium text-pewter block uppercase tracking-wide">Target</span>
          <span className="font-display text-sm sm:text-base font-bold text-graphite block tnum leading-tight mt-0.5">
            {formatCurrency(goal.target_amount)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium text-pewter block uppercase tracking-wide">Remaining Gap</span>
          <span className="font-display text-sm sm:text-base font-bold text-ember-dark block tnum leading-tight mt-0.5">
            {formatCurrency(remainingGap)}
          </span>
        </div>
      </div>

      {/* Dynamic Pace Projection Badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-chip bg-white border border-black/[0.06] text-xs">
        <Sparkles className="h-3.5 w-3.5 text-ember shrink-0" />
        <span className="text-graphite font-medium leading-relaxed">
          {paceProjectionText}
        </span>
      </div>

      {/* Interactive Contribution Row & Delete Trigger */}
      <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-[170px]">
          <input
            type="number"
            min={0}
            placeholder="Add amount"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-28 rounded-chip border border-mist bg-white px-2.5 py-1.5 text-xs text-ink placeholder:text-pewter focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember tnum"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleContribute()}
            disabled={saving || !contribution}
            className="h-8 text-xs font-semibold px-2.5"
          >
            {saving ? "Saving..." : "Add"}
          </Button>
          <button
            type="button"
            onClick={() => handleContribute(5000)}
            disabled={saving}
            className="hidden sm:inline-flex rounded-full px-2 py-1 text-[11px] font-medium text-graphite bg-fog hover:bg-white border border-mist cursor-pointer tnum"
          >
            +₹5k
          </button>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-pewter hover:text-rose-600 transition-colors p-1.5 rounded-chip hover:bg-rose-50 cursor-pointer disabled:opacity-40 ml-auto"
          title="Delete goal"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
