import type { Debt } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";

export function DebtsList({ debts }: { debts: Debt[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debts</CardTitle>
      </CardHeader>
      {debts.length === 0 ? (
        <p className="text-sm text-pewter">No debts on record.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-mist">
          {debts.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">{formatCurrency(d.principal)} principal</p>
                <p className="text-xs text-pewter">
                  {d.interest_rate_apr.toFixed(1)}% APR &middot; due day {d.due_day_of_month}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink">
                {formatCurrency(d.minimum_payment)} min/mo
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
