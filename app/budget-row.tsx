"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Id } from "@/convex/_generated/dataModel";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type SpendTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountName: string;
};

export function BudgetRow({
  categoryId,
  categoryName,
  monthlyLimit,
  mtdSpend,
  remaining,
  percentUsed,
  transactions = [],
}: {
  categoryId: Id<"categories">;
  categoryName: string;
  monthlyLimit: number;
  mtdSpend: number;
  remaining: number;
  percentUsed: number;
  transactions?: SpendTransaction[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(monthlyLimit));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const over = remaining < 0;
  const barWidth = Math.min(Math.max(percentUsed, 0), 100);

  async function save() {
    setError(null);
    const nextLimit = Number(draft);
    if (!Number.isFinite(nextLimit) || nextLimit < 0) {
      setError("Enter a valid amount");
      return;
    }
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyLimit: nextLimit }),
    });
    if (!res.ok) {
      setError("Could not save budget");
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left font-medium"
          aria-expanded={open}
        >
          <span
            className="inline-block shrink-0 text-zinc-400 transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ▸
          </span>
          <span className="truncate">{categoryName}</span>
          {transactions.length > 0 && (
            <span className="shrink-0 text-xs font-normal text-zinc-400">
              {transactions.length} txn{transactions.length === 1 ? "" : "s"}
            </span>
          )}
        </button>

        <p className="shrink-0 text-sm tabular-nums text-zinc-500">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="tabular-nums"
          >
            {usd.format(mtdSpend)}
          </button>
          <span className="text-zinc-400"> / </span>
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-zinc-400">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-20 rounded border border-zinc-300 bg-transparent px-1.5 py-0.5 text-zinc-900 tabular-nums dark:border-zinc-700 dark:text-zinc-100"
                disabled={pending}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") {
                    setDraft(String(monthlyLimit));
                    setEditing(false);
                    setError(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={pending}
                className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
              >
                Save
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(String(monthlyLimit));
                setEditing(true);
                setError(null);
              }}
              className="tabular-nums text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
              title="Edit monthly budget"
            >
              {usd.format(monthlyLimit)}
            </button>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="block w-full text-left"
        aria-label={`${open ? "Hide" : "Show"} ${categoryName} transactions`}
      >
        <div
          className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900"
          role="progressbar"
          aria-valuenow={Math.round(percentUsed)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${categoryName} budget used`}
        >
          <div
            className={`h-full rounded-full transition-[width] ${
              over ? "bg-red-500" : "bg-zinc-800 dark:bg-zinc-200"
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </button>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {Math.round(percentUsed)}% used
          {open ? " · hide" : " · show txns"}
        </button>
        <span className={over ? "text-red-600 dark:text-red-400" : undefined}>
          {over
            ? `${usd.format(-remaining)} over`
            : `${usd.format(remaining)} left`}
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {open && (
        <ul className="mt-1 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          {transactions.length === 0 ? (
            <li className="text-sm text-zinc-500">
              No month-to-date spend in this category yet.
            </li>
          ) : (
            transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="text-xs text-zinc-500">
                    {t.date} · {t.accountName}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{usd.format(t.amount)}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
