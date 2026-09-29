"use client";

import { useCallback, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import type { Budget, BudgetStatus, TxnCategory } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORIES: TxnCategory[] = [
  "rent_housing",
  "emi_loan",
  "groceries",
  "dining",
  "transport",
  "utilities",
  "subscriptions",
  "shopping",
  "healthcare",
  "entertainment",
  "investment_sip",
  "fees_interest",
  "other",
];

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

/** percent_used might land as a 0-1 ratio or a 0-100 value once the real
 * backend ships -- normalize defensively so the bar never overflows or
 * reads as ~1% for a fully-spent budget. */
function normalizePercent(value: number): number {
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export default function BudgetsPage() {
  const userId = useUserId();

  const fetchSafeToSpend = useCallback(() => api.safeToSpend(userId), [userId]);
  const safeToSpend = useAsync(fetchSafeToSpend, [userId]);

  const fetchBudgets = useCallback(() => api.budgets(userId), [userId]);
  const budgets = useAsync(fetchBudgets, [userId]);

  const fetchStatus = useCallback(() => api.budgetStatus(userId), [userId]);
  const status = useAsync(fetchStatus, [userId]);

  const [newCategory, setNewCategory] = useState<TxnCategory>(CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    const limit = Number(newLimit);
    if (!limit || limit <= 0) {
      setCreateError("Enter a monthly limit greater than zero.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.createBudget(userId, { category: newCategory, monthly_limit: limit });
      setNewLimit("");
      budgets.reload();
      status.reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create budget");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(budgetId: string) {
    await api.deleteBudget(userId, budgetId);
    budgets.reload();
    status.reload();
  }

  const chartData = (status.data ?? []).map((b) => ({
    category: categoryLabel(b.category),
    spent: b.spent_so_far,
  }));

  // BudgetStatus is keyed by category, not budget id (delete needs the id) --
  // join against the plain budgets list, which does carry ids, by category.
  const budgetIdByCategory = new Map<string, string>((budgets.data ?? []).map((b: Budget) => [b.category, b.id]));

  const loadingAll = status.loading && !status.data;
  const anyError = status.error ?? budgets.error;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Budgets</h1>
        <p className="mt-1 text-sm text-graphite">Set monthly limits and track what&apos;s safe to spend.</p>
      </div>

      <Card>
        {safeToSpend.loading && !safeToSpend.data ? (
          <p className="text-sm text-pewter">Loading safe-to-spend...</p>
        ) : safeToSpend.error ? (
          <p className="text-sm text-ink">Could not load safe-to-spend: {safeToSpend.error}</p>
        ) : safeToSpend.data ? (
          <StatTile
            label="Safe to spend today"
            value={formatCurrency(safeToSpend.data.amount)}
            sub={`${safeToSpend.data.basis} · as of ${formatDate(safeToSpend.data.as_of_date)}`}
          />
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a budget</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="budget-category" className="text-xs text-pewter">
              Category
            </label>
            <select
              id="budget-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TxnCategory)}
              className="rounded-chip border border-mist px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="budget-limit" className="text-xs text-pewter">
              Monthly limit
            </label>
            <input
              id="budget-limit"
              type="number"
              min={0}
              placeholder="10000"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-32 rounded-chip border border-mist px-3 py-2 text-sm"
            />
          </div>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Adding..." : "Add budget"}
          </Button>
        </div>
        {createError && <p className="mt-2 text-sm text-ink">{createError}</p>}
      </Card>

      {loadingAll && <p className="text-sm text-pewter">Loading budgets...</p>}

      {anyError && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-ink">Could not load budgets: {anyError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              budgets.reload();
              status.reload();
            }}
            className="self-start"
          >
            Retry
          </Button>
        </Card>
      )}

      {status.data && status.data.length === 0 && (
        <Card>
          <p className="text-sm text-pewter">No budgets set yet. Add one above to start tracking spend.</p>
        </Card>
      )}

      {status.data && status.data.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {status.data.map((b) => (
              <BudgetRow key={b.category} status={b} budgetId={budgetIdByCategory.get(b.category)} onDelete={handleDelete} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Spending breakdown</CardTitle>
            </CardHeader>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 8, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fog)" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "var(--color-pewter)" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tick={{ fontSize: 11, fill: "var(--color-pewter)" }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
                    contentStyle={{ borderRadius: 6, borderColor: "var(--color-mist)", fontSize: 12 }}
                  />
                  <Bar dataKey="spent" fill="var(--color-ember)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function BudgetRow({
  status,
  budgetId,
  onDelete,
}: {
  status: BudgetStatus;
  budgetId: string | undefined;
  onDelete: (budgetId: string) => void;
}) {
  const width = normalizePercent(status.percent_used);
  const needsAttention = status.status === "near" || status.status === "over";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{categoryLabel(status.category)}</p>
          <p className="text-xs text-pewter">
            {formatCurrency(status.spent_so_far)} of {formatCurrency(status.monthly_limit)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-pewter">{formatCurrency(status.remaining)} left</span>
          {budgetId && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(budgetId)}>
              Delete
            </Button>
          )}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-chip bg-fog">
        <div className={needsAttention ? "h-full bg-ember" : "h-full bg-ink"} style={{ width: `${width}%` }} />
      </div>
    </Card>
  );
}
