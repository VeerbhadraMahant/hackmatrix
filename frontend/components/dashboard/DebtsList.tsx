import type { Debt } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DebtsList({ debts }: { debts: Debt[] }) {
  const totalPrincipal = debts.reduce((acc, d) => acc + d.principal, 0);
  const totalMinPayment = debts.reduce((acc, d) => acc + d.minimum_payment, 0);

  // Find debt with highest APR for avalanche strategy highlight
  const highestAprId = debts.length
    ? debts.reduce((max, d) => (d.interest_rate_apr > max.interest_rate_apr ? d : max), debts[0]).id
    : null;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Debts & Loans</CardTitle>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-fog border border-black/[0.06] text-graphite">
              {debts.length} Accounts
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-ink tnum block">
              {formatCurrency(totalPrincipal)}
            </span>
            <span className="text-[10px] text-pewter">
              {formatCurrency(totalMinPayment)}/mo min
            </span>
          </div>
        </CardHeader>

        {debts.length === 0 ? (
          <div className="py-8 text-center text-sm text-pewter">
            No debt accounts on record.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-black/[0.04]">
            {debts.map((d) => {
              const isHighApr = d.interest_rate_apr >= 20;
              const isAvalancheTarget = d.id === highestAprId && debts.length > 1;

              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-fog/40 px-1 rounded-chip transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold shrink-0",
                        isHighApr
                          ? "bg-rose-50 text-rose-600 border-rose-200"
                          : "bg-fog text-graphite border-black/[0.06]"
                      )}
                    >
                      {d.account_id?.includes("card") || isHighApr ? "💳" : "🏦"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink leading-snug">
                          {formatCurrency(d.principal)}
                        </p>
                        {isAvalancheTarget && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Avalanche Target
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-pewter">
                        Due day {d.due_day_of_month} &middot;{" "}
                        <span
                          className={cn(
                            "font-semibold",
                            isHighApr ? "text-rose-600" : "text-graphite"
                          )}
                        >
                          {d.interest_rate_apr.toFixed(1)}% APR
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-ink tnum block">
                      {formatCurrency(d.minimum_payment)}
                    </span>
                    <span className="text-[10px] text-pewter">min / month</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-black/[0.04] text-[11px] text-pewter flex items-center justify-between">
        <span>Avalanche & Snowball strategies evaluated</span>
        <span className="text-ember font-medium">Zero-penalty prepayment eligible</span>
      </div>
    </Card>
  );
}
