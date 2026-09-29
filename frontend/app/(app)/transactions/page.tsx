"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CreditCard,
  Download,
  Film,
  HeartPulse,
  Home,
  Percent,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Zap,
  HelpCircle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync, useDebouncedValue, useUserId } from "@/lib/hooks";
import { isDemoUserId } from "@/lib/user";
import { AddDataPanel } from "@/components/dashboard/AddDataPanel";
import type { Transaction, TxnCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const CATEGORY_CONFIG: Record<
  TxnCategory,
  { label: string; icon: LucideIcon; tone: "neutral" | "accent" | "outline" | "success" | "warning" | "danger" | "info" }
> = {
  income: { label: "Income", icon: ArrowDownLeft, tone: "success" },
  rent_housing: { label: "Rent & Housing", icon: Home, tone: "info" },
  emi_loan: { label: "EMI & Loan", icon: CreditCard, tone: "danger" },
  groceries: { label: "Groceries", icon: ShoppingCart, tone: "success" },
  dining: { label: "Dining & Food", icon: Utensils, tone: "warning" },
  transport: { label: "Transport & Fuel", icon: Car, tone: "neutral" },
  utilities: { label: "Utilities", icon: Zap, tone: "accent" },
  subscriptions: { label: "Subscriptions", icon: Cloud, tone: "info" },
  shopping: { label: "Shopping", icon: ShoppingBag, tone: "accent" },
  healthcare: { label: "Healthcare", icon: HeartPulse, tone: "danger" },
  entertainment: { label: "Entertainment", icon: Film, tone: "info" },
  investment_sip: { label: "Investment & SIP", icon: TrendingUp, tone: "success" },
  credit_card_payment: { label: "Credit Card", icon: CreditCard, tone: "neutral" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, tone: "neutral" },
  fees_interest: { label: "Fees & Interest", icon: Percent, tone: "warning" },
  other: { label: "Other", icon: HelpCircle, tone: "neutral" },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as TxnCategory[];

function categoryLabel(cat: string): string {
  const item = CATEGORY_CONFIG[cat as TxnCategory];
  return item ? item.label : cat.replace(/_/g, " ");
}

type QuickFilterId = "all" | "subscriptions" | "high_value" | "inflow" | "dining" | "groceries" | "shopping";

interface QuickFilter {
  id: QuickFilterId;
  label: string;
  category?: TxnCategory;
  isHighValue?: boolean;
  isInflow?: boolean;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: "all", label: "All" },
  { id: "subscriptions", label: "Subscriptions", category: "subscriptions" },
  { id: "high_value", label: "High Value (> ₹5k)", isHighValue: true },
  { id: "inflow", label: "Inflow", isInflow: true },
  { id: "dining", label: "Dining", category: "dining" },
  { id: "groceries", label: "Groceries", category: "groceries" },
  { id: "shopping", label: "Shopping", category: "shopping" },
];

type SortField = "date" | "merchant" | "category" | "amount";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const userId = useUserId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<TxnCategory | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterId>("all");

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchTransactions = useCallback(
    () =>
      api.transactions(userId, {
        search: debouncedSearch || undefined,
        category: category || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    [userId, debouncedSearch, category, dateFrom, dateTo, page]
  );
  const { data, error, loading, reload } = useAsync(
    fetchTransactions,
    [userId, debouncedSearch, category, dateFrom, dateTo, page],
    { identity: userId }
  );

  function resetToFirstPage() {
    setPage(1);
  }

  function handleQuickFilterClick(qf: QuickFilter) {
    if (activeQuickFilter === qf.id && qf.id !== "all") {
      setActiveQuickFilter("all");
      setCategory("");
      resetToFirstPage();
      return;
    }

    setActiveQuickFilter(qf.id);
    resetToFirstPage();

    if (qf.category) {
      setCategory(qf.category);
    } else if (qf.id === "all") {
      setCategory("");
    } else {
      setCategory("");
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "amount" || field === "date" ? "desc" : "asc");
    }
  }

  // Client-side filtering and sorting for active page items
  const pageItems = data?.items;
  const displayItems = useMemo(() => {
    if (!pageItems) return [];
    let items = [...pageItems];

    if (activeQuickFilter === "high_value") {
      items = items.filter((t) => Math.abs(t.amount) > 5000);
    } else if (activeQuickFilter === "inflow") {
      items = items.filter((t) => t.amount > 0);
    }

    items.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "merchant") {
        comparison = a.merchant.localeCompare(b.merchant);
      } else if (sortField === "category") {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return items;
  }, [pageItems, activeQuickFilter, sortField, sortDirection]);

  function handleExportCSV() {
    const itemsToExport = displayItems.length > 0 ? displayItems : data?.items ?? [];
    if (itemsToExport.length === 0) return;

    const headers = ["ID", "Date", "Merchant", "Category", "Amount (INR)", "Account ID"];
    const rows = itemsToExport.map((t) => [
      t.id,
      t.date,
      `"${t.merchant.replace(/"/g, '""')}"`,
      t.category,
      t.amount,
      t.account_id,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "finpilot_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-8 pb-16 min-w-0 max-w-full">
      {/* Editorial Fraunces Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/[0.04]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ember bg-orange-50 px-2.5 py-0.5 rounded-full border border-ember/20">
              Double-Entry Ledger
            </span>
            <span className="text-xs text-pewter font-medium">• Audited Financial Feeds</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink mt-1.5 tracking-tight">
            Transactions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-graphite max-w-2xl leading-relaxed">
            Search, filter, audit, and reclassify your cash-flow transactions with real-time category attribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={!data || data.items.length === 0}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Quick Filter Pills Row */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-pewter uppercase tracking-wider">
          Quick Filters
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_FILTERS.map((qf) => {
            const isActive = activeQuickFilter === qf.id;
            return (
              <button
                key={qf.id}
                type="button"
                onClick={() => handleQuickFilterClick(qf)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                  isActive
                    ? "bg-ink text-white shadow-sm ring-1 ring-ink font-semibold"
                    : "bg-fog text-graphite border border-mist hover:bg-white hover:text-ink hover:border-black/[0.15]"
                )}
              >
                {isActive && <Check className="h-3 w-3 text-ember" />}
                <span>{qf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isDemoUserId(userId) && (
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="secondary" size="sm" onClick={() => setShowAdd((v) => !v)} className="text-xs font-semibold">
              {showAdd ? "Close" : "+ Add transaction"}
            </Button>
          </div>
          {showAdd && (
            <Card className="p-5 sm:p-6">
              <AddDataPanel userId={userId} />
            </Card>
          )}
        </div>
      )}

      {/* Primary Search & Date Filter Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pewter pointer-events-none" />
            <input
              type="search"
              placeholder="Search merchant or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToFirstPage();
              }}
              className="w-full rounded-chip border border-mist bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-pewter focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value as TxnCategory | "";
                setCategory(val);
                if (val === "") {
                  setActiveQuickFilter("all");
                } else if (QUICK_FILTERS.some((qf) => qf.category === val)) {
                  setActiveQuickFilter(val as QuickFilterId);
                } else {
                  setActiveQuickFilter("all");
                }
                resetToFirstPage();
              }}
              className="rounded-chip border border-mist bg-white px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-chip border border-mist bg-white px-2.5 py-1.5 text-xs text-graphite">
              <span className="text-pewter font-medium">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  resetToFirstPage();
                }}
                className="bg-transparent text-xs text-ink focus:outline-none"
                aria-label="From date"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-chip border border-mist bg-white px-2.5 py-1.5 text-xs text-graphite">
              <span className="text-pewter font-medium">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  resetToFirstPage();
                }}
                className="bg-transparent text-xs text-ink focus:outline-none"
                aria-label="To date"
              />
            </div>

            {(search || category || dateFrom || dateTo || activeQuickFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setDateFrom("");
                  setDateTo("");
                  setActiveQuickFilter("all");
                  resetToFirstPage();
                }}
                className="text-xs text-pewter hover:text-ink px-2"
                title="Clear all filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error View */}
      {error && (
        <Card className="flex flex-col gap-3 border-rose-200 bg-rose-50/30 p-6">
          <p className="text-sm font-semibold text-rose-800">Could not load transactions: {error}</p>
          <Button variant="secondary" size="sm" onClick={reload} className="self-start">
            Retry Loading
          </Button>
        </Card>
      )}

      {/* Main Ledger Table Card */}
      <Card className="p-0 sm:p-0 overflow-hidden max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-[620px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06] bg-fog/75 text-xs font-semibold uppercase tracking-wider text-pewter select-none">
                <SortableHeader
                  field="date"
                  label="Date"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="pl-6 py-3.5"
                />
                <SortableHeader
                  field="merchant"
                  label="Merchant / Details"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-6 py-3.5"
                />
                <SortableHeader
                  field="category"
                  label="Category Classification"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-6 py-3.5"
                />
                <SortableHeader
                  field="amount"
                  label="Amount"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="pr-6 py-3.5 text-right"
                  align="right"
                />
              </tr>
            </thead>

            {loading && !data ? (
              <tbody className="divide-y divide-black/[0.04]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="pl-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-28 rounded-chip" />
                    </td>
                    <td className="pr-6 py-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : displayItems.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="p-8">
                    <EmptyState
                      icon={<Receipt className="h-10 w-10 text-pewter" />}
                      title="No transactions match these filters"
                      body="Try adjusting your search terms, removing date boundaries, or switching the active category filter."
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setCategory("");
                            setDateFrom("");
                            setDateTo("");
                            setActiveQuickFilter("all");
                            resetToFirstPage();
                          }}
                        >
                          Reset Filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-black/[0.04] bg-white">
                {displayItems.map((txn) => (
                  <TransactionRow key={txn.id} txn={txn} userId={userId} onUpdated={reload} />
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination & Ledger Stats Footer */}
        {data && data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-black/[0.06] bg-fog/40 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-pewter">
              <span>Showing</span>
              <span className="font-semibold text-ink tnum">
                {Math.min(data.total, (page - 1) * PAGE_SIZE + 1)}–
                {Math.min(data.total, (page - 1) * PAGE_SIZE + displayItems.length)}
              </span>
              <span>of</span>
              <span className="font-semibold text-ink tnum">{data.total}</span>
              <span>transactions</span>
              {activeQuickFilter !== "all" && (
                <span className="text-[11px] text-ember font-medium ml-1">
                  (filtered by {QUICK_FILTERS.find((q) => q.id === activeQuickFilter)?.label})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="text-xs text-graphite font-medium px-2 tnum">
                Page {page} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * PAGE_SIZE >= data.total || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-2.5 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
  align?: "left" | "right";
}

function SortableHeader({
  field,
  label,
  currentField,
  direction,
  onSort,
  className,
  align = "left",
}: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold text-xs tracking-wider transition-colors hover:text-ink cursor-pointer focus:outline-none",
          isActive ? "text-ink font-bold" : "text-pewter",
          align === "right" && "justify-end w-full"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3 text-ember" />
          ) : (
            <ArrowDown className="h-3 w-3 text-ember" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
        )}
      </button>
    </th>
  );
}

function TransactionRow({
  txn,
  userId,
  onUpdated,
}: {
  txn: Transaction;
  userId: string;
  onUpdated: () => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isInflow = txn.amount > 0;
  const config = CATEGORY_CONFIG[txn.category] || CATEGORY_CONFIG.other;
  const CategoryIcon = config.icon;

  useEffect(() => {
    if (!popoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  async function handleSelectCategory(next: TxnCategory) {
    if (next === txn.category) {
      setPopoverOpen(false);
      return;
    }
    setSaving(true);
    setPopoverOpen(false);
    try {
      await api.updateTransaction(userId, txn.id, { category: next });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="hover:bg-fog/50 transition-colors duration-150 group">
      {/* Date */}
      <td className="whitespace-nowrap pl-6 py-3.5 text-xs text-graphite tnum font-medium">
        {formatDate(txn.date)}
      </td>

      {/* Merchant / Description */}
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fog border border-black/[0.05] text-graphite shrink-0">
            <CategoryIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-ink block leading-tight text-sm">
              {txn.merchant}
            </span>
            <span className="text-[11px] text-pewter block mt-0.5">
              Ref: {txn.account_id}
            </span>
          </div>
        </div>
      </td>

      {/* Interactive Category Badge & Popover Picker */}
      <td className="px-6 py-3.5 relative">
        <div className="relative inline-block" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            disabled={saving}
            className="group/badge inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ember/40 rounded-chip transition-transform active:scale-[0.98]"
            title="Click to reclassify category"
          >
            <Chip tone={config.tone} className="cursor-pointer hover:shadow-xs py-1 px-2.5 text-xs">
              <CategoryIcon className="h-3.5 w-3.5 mr-0.5 shrink-0" />
              <span>{saving ? "Saving..." : config.label}</span>
              <ChevronDown className="h-3 w-3 opacity-50 group-hover/badge:opacity-100 transition-opacity ml-0.5" />
            </Chip>
          </button>

          {/* Clean Floating Popover Category Picker */}
          {popoverOpen && (
            <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-surface border border-mist bg-white/98 p-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.06]">
                <span className="text-xs font-semibold text-ink">Reclassify Category</span>
                <span className="text-[10px] text-pewter uppercase tracking-wide">Ledger Rule</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {CATEGORIES.map((catKey) => {
                  const item = CATEGORY_CONFIG[catKey];
                  const ItemIcon = item.icon;
                  const isSelected = txn.category === catKey;

                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => handleSelectCategory(catKey)}
                      className={cn(
                        "flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer select-none",
                        isSelected
                          ? "bg-ink text-white font-semibold shadow-xs"
                          : "text-graphite hover:bg-fog hover:text-ink"
                      )}
                    >
                      <ItemIcon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-ember" : "text-pewter")} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Amount with Tabular Numerals */}
      <td className="whitespace-nowrap pr-6 py-3.5 text-right">
        <span
          className={cn(
            "tnum font-semibold text-sm",
            isInflow ? "text-emerald-700" : "text-ink"
          )}
        >
          {isInflow ? "+" : "-"}
          {formatCurrency(Math.abs(txn.amount))}
        </span>
      </td>
    </tr>
  );
}
