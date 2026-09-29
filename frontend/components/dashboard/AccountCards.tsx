"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatCurrency } from "@/lib/format";

/**
 * Standalone, self-fetching -- takes only userId so the lead can drop this
 * into dashboard/page.tsx in one line without threading data through it.
 */
export function AccountCards({ userId }: { userId: string }) {
  const fetchAccounts = useCallback(() => api.accounts(userId), [userId]);
  const { data, error, loading, reload } = useAsync(fetchAccounts, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      {loading && !data && <p className="text-sm text-pewter">Loading accounts...</p>}
      {error && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">Could not load accounts: {error}</p>
          <button onClick={reload} className="self-start text-xs text-graphite underline">
            Retry
          </button>
        </div>
      )}
      {data && data.length === 0 && <p className="text-sm text-pewter">No linked accounts yet.</p>}
      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((account) => (
            <div key={account.id} className="rounded-chip border border-mist p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{account.name}</p>
                <Chip tone="outline">{account.type.replace(/_/g, " ")}</Chip>
              </div>
              <p className="mt-2 text-lg font-semibold text-ink">{formatCurrency(account.balance)}</p>
              {account.interest_rate_apr != null && (account.type === "credit_card" || account.type === "loan") && (
                <p className="mt-1 text-xs text-pewter">{account.interest_rate_apr.toFixed(1)}% APR</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
