"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useAsync, useUserId } from "@/lib/hooks";
import type { Transaction, TxnCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORIES: TxnCategory[] = [
  "income",
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
  "credit_card_payment",
  "transfer",
  "fees_interest",
  "other",
];

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const userId = useUserId();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TxnCategory | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(
    () =>
      api.transactions(userId, {
        search: search || undefined,
        category: category || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    [userId, search, category, dateFrom, dateTo, page]
  );
  const { data, error, loading, reload } = useAsync(fetchTransactions, [userId, search, category, dateFrom, dateTo, page]);

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Transactions</h1>
        <p className="mt-1 text-sm text-graphite">Search, filter, and reclassify your ledger.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search merchant or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
            className="min-w-[220px] flex-1 rounded-chip border border-mist px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TxnCategory | "");
              resetToFirstPage();
            }}
            className="rounded-chip border border-mist px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetToFirstPage();
            }}
            className="rounded-chip border border-mist px-3 py-2 text-sm text-graphite"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetToFirstPage();
            }}
            className="rounded-chip border border-mist px-3 py-2 text-sm text-graphite"
            aria-label="To date"
          />
        </div>
      </Card>

      {loading && !data && <p className="text-sm text-pewter">Loading transactions...</p>}

      {error && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-ink">Could not load transactions: {error}</p>
          <Button variant="secondary" size="sm" onClick={reload} className="self-start">
            Retry
          </Button>
        </Card>
      )}

      {data && (
        <Card className="p-0 sm:p-0">
          {data.items.length === 0 ? (
            <p className="p-6 text-sm text-pewter sm:p-8">No transactions match these filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-mist text-xs uppercase tracking-wide text-pewter">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Merchant</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {data.items.map((txn) => (
                      <TransactionRow key={txn.id} txn={txn} userId={userId} onUpdated={reload} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-mist px-6 py-4 sm:px-8">
                <p className="text-xs text-pewter">
                  Page {data.page} &middot; {data.total} total
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * PAGE_SIZE >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function TransactionRow({ txn, userId, onUpdated }: { txn: Transaction; userId: string; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isInflow = txn.amount > 0;

  async function handleCategoryChange(next: TxnCategory) {
    if (next === txn.category) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.updateTransaction(userId, txn.id, { category: next });
      onUpdated();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <tr>
      <td className="whitespace-nowrap px-6 py-3 text-graphite">{formatDate(txn.date)}</td>
      <td className="px-6 py-3 font-medium text-ink">{txn.merchant}</td>
      <td className="px-6 py-3">
        {editing ? (
          <select
            autoFocus
            disabled={saving}
            defaultValue={txn.category}
            onChange={(e) => handleCategoryChange(e.target.value as TxnCategory)}
            onBlur={() => setEditing(false)}
            className="rounded-chip border border-mist px-2 py-1 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        ) : (
          <button onClick={() => setEditing(true)} disabled={saving} className="text-left">
            <Chip tone="outline" className="cursor-pointer hover:bg-fog">
              {saving ? "Saving..." : categoryLabel(txn.category)}
            </Chip>
          </button>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right">
        <span className={isInflow ? "font-medium text-ink" : "text-graphite"}>
          {isInflow ? "+" : ""}
          {formatCurrency(Math.abs(txn.amount))}
        </span>
      </td>
    </tr>
  );
}
