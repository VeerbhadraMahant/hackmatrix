"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "account" | "transaction" | "csv";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Add account" },
  { id: "transaction", label: "Add transaction" },
  { id: "csv", label: "Upload CSV" },
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
  { value: "investment", label: "Investment" },
];

const inputClass =
  "w-full rounded-chip border border-black/[0.1] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ember/30";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-pewter">{label}</span>
      {children}
    </label>
  );
}

/** Lets a signed-in user build up their own data: accounts, single
 * transactions/income, or a bank-statement CSV. `onAdded` fires after each
 * successful write so the parent can refetch the dashboard. */
export function AddDataPanel({ userId, onAdded }: { userId: string; onAdded?: () => void }) {
  const [tab, setTab] = useState<Tab>("account");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");

  const [isIncome, setIsIncome] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [file, setFile] = useState<File | null>(null);

  async function run(fn: () => Promise<string>, reset: () => void) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await fn());
      reset();
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function submitAccount(e: FormEvent) {
    e.preventDefault();
    run(
      async () => {
        await api.createAccount(userId, { name, type, balance: Number(balance) || 0 });
        return `Added ${name}.`;
      },
      () => {
        setName("");
        setBalance("");
      }
    );
  }

  function submitTransaction(e: FormEvent) {
    e.preventDefault();
    run(
      async () => {
        const value = Math.abs(Number(amount));
        await api.addEvent(userId, {
          kind: "transaction",
          merchant,
          amount: isIncome ? value : -value,
          date,
        });
        return `Added ${isIncome ? "income" : "expense"}: ${merchant}.`;
      },
      () => {
        setMerchant("");
        setAmount("");
      }
    );
  }

  function submitCsv(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    run(
      async () => {
        await api.upload(userId, file);
        return `Imported ${file.name}.`;
      },
      () => setFile(null)
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="flex flex-wrap gap-1 rounded-full border border-mist bg-fog p-1 self-start">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all",
              tab === t.id ? "bg-paper text-ink font-semibold border border-mist shadow-xs" : "text-pewter hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <form onSubmit={submitAccount} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Account name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. HDFC Savings" />
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={inputClass}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={type === "credit_card" || type === "loan" ? "Amount owed (negative, ₹)" : "Current balance (₹)"}>
            <input type="number" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} className={inputClass} placeholder="0" />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Add account"}
            </Button>
          </div>
        </form>
      )}

      {tab === "transaction" && (
        <form onSubmit={submitTransaction} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Kind">
            <select value={isIncome ? "income" : "expense"} onChange={(e) => setIsIncome(e.target.value === "income")} className={inputClass}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </Field>
          <Field label={isIncome ? "Source" : "Merchant"}>
            <input required value={merchant} onChange={(e) => setMerchant(e.target.value)} className={inputClass} placeholder={isIncome ? "e.g. Salary" : "e.g. Swiggy"} />
          </Field>
          <Field label="Amount (₹)">
            <input required type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {busy ? "Saving…" : isIncome ? "Add income" : "Add expense"}
            </Button>
          </div>
        </form>
      )}

      {tab === "csv" && (
        <form onSubmit={submitCsv} className="flex flex-col gap-4">
          <p className="text-xs text-graphite">
            Upload a bank-statement CSV with <code>date</code>, <code>amount</code> and <code>merchant</code> columns.
            Categories are detected automatically.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-graphite file:mr-3 file:rounded-chip file:border file:border-mist file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
          <div>
            <Button type="submit" variant="primary" size="sm" disabled={busy || !file}>
              {busy ? "Importing…" : "Import CSV"}
            </Button>
          </div>
        </form>
      )}

      {error ? <p className="text-xs text-rose-600 break-words">{error}</p> : null}
      {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
    </div>
  );
}
