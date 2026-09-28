"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { RecurringList } from "@/components/dashboard/RecurringList";
import { DebtsList } from "@/components/dashboard/DebtsList";
import { AnswerContractView } from "@/components/AnswerContractView";
import { formatCurrency, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const userId = useUserId();
  const fetchDashboard = useCallback(() => api.dashboard(userId), [userId]);
  const { data, error, loading, reload } = useAsync(fetchDashboard, [userId]);

  if (loading && !data) {
    return <p className="text-sm text-pewter">Loading your financial snapshot...</p>;
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-ink">Could not load the dashboard: {error}</p>
        <p className="text-xs text-pewter">
          Is the backend running at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}?
        </p>
        <Button variant="secondary" size="sm" onClick={reload} className="self-start">
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-12">
      <HealthScoreCard score={data.health_score} />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Card>
          <StatTile label="Net worth" value={formatCurrency(data.net_worth)} />
        </Card>
        <Card>
          <StatTile label="Monthly income" value={formatCurrency(data.monthly_income)} />
        </Card>
        <Card>
          <StatTile label="Monthly expenses" value={formatCurrency(data.monthly_expenses)} />
        </Card>
        <Card>
          <StatTile label="Savings rate" value={formatPercent(data.savings_rate)} />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash-flow forecast</CardTitle>
        </CardHeader>
        <ForecastChart forecast={data.forecast} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecurringList obligations={data.recurring_obligations} />
        <DebtsList debts={data.debts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <AnswerContractView answer={data.insights} />
      </Card>
    </div>
  );
}
