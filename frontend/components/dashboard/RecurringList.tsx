import type { RecurringObligation } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfidenceChip } from "@/components/ui/ConfidenceChip";
import { Chip } from "@/components/ui/Chip";
import { formatCurrency, formatDate } from "@/lib/format";

export function RecurringList({ obligations }: { obligations: RecurringObligation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring obligations</CardTitle>
      </CardHeader>
      {obligations.length === 0 ? (
        <p className="text-sm text-pewter">No recurring obligations detected yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-mist">
          {obligations.map((o) => (
            <li key={o.group_id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">{o.merchant}</p>
                <p className="text-xs text-pewter">
                  Next: {formatDate(o.next_expected_date)} &middot; {o.frequency}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone="outline">{o.category.replace(/_/g, " ")}</Chip>
                <ConfidenceChip value={o.confidence} />
                <span className="w-24 text-right text-sm font-semibold text-ink">
                  {formatCurrency(Math.abs(o.amount))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
