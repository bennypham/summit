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
  categoryId?: Id<"categories"> | string;
  categoryName: string;
  monthlyLimit: number | null;
  mtdSpend: number;
  remaining?: number;
  percentUsed?: number;
  transactions?: SpendTransaction[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    monthlyLimit != null ? String(monthlyLimit) : "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasBudget = monthlyLimit != null;
  const over = hasBudget && (remaining ?? 0) < 0;
  const barWidth = Math.min(Math.max(percentUsed ?? 0, 0), 100);
  const canEdit =
    hasBudget &&
    typeof categoryId === "string" &&
    categoryId !== "uncategorized";

  async function save() {
    if (!canEdit || typeof categoryId !== "string") return;
    setError(null);
    const nextLimit = Number(draft);
    if (!Number.isFinite(nextLimit) || nextLimit < 0) {
      setError("Enter a valid amount");
      return;
    }
    let res: Response;
    try {
      res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, monthlyLimit: nextLimit }),
      });
    } catch {
      setError("Network error — please try again");
      return;
    }
    if (!res.ok) {
      setError("Could not save budget");
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left font-medium text-ink"
          aria-expanded={open}
        >
          <span
            className="inline-block shrink-0 text-faint transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ▸
          </span>
          <span className="truncate">{categoryName}</span>
          {transactions.length > 0 && (
            <span className="shrink-0 text-caption font-normal text-subtle">
              {transactions.length}
            </span>
          )}
        </button>

        <p className="shrink-0 text-caption tabular-nums text-muted">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="tabular-nums"
          >
            {usd.format(mtdSpend)}
          </button>
          {hasBudget && (
            <>
              <span className="text-subtle"> / </span>
              {editing ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-subtle">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-20 rounded-sm border border-border-strong bg-field px-1.5 py-0.5 text-ink tabular-nums"
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
                    className="text-caption font-medium text-body underline-offset-2 hover:underline"
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
                  className="tabular-nums text-body underline-offset-2 hover:underline"
                  title="Edit monthly budget"
                >
                  {usd.format(monthlyLimit)}
                </button>
              )}
            </>
          )}
          {!hasBudget && <span className="text-subtle"> · no budget</span>}
        </p>
      </div>

      {hasBudget && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="block w-full text-left"
            aria-label={`${open ? "Hide" : "Show"} ${categoryName} transactions`}
          >
            <div
              className="h-1.5 overflow-hidden rounded-full bg-wash"
              role="progressbar"
              aria-valuenow={Math.round(percentUsed ?? 0)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${categoryName} budget used`}
            >
              <div
                className={`h-full rounded-full transition-[width] ${
                  over ? "bg-danger" : "bg-ink"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </button>

          <div className="flex items-center justify-between text-caption text-muted">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="hover:text-body"
            >
              {Math.round(percentUsed ?? 0)}% used
              {open ? " · hide" : " · show"}
            </button>
            <span className={over ? "text-danger" : undefined}>
              {over
                ? `${usd.format(-(remaining ?? 0))} over`
                : `${usd.format(remaining ?? 0)} left`}
            </span>
          </div>
        </>
      )}

      {!hasBudget && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-left text-caption text-muted hover:text-body"
        >
          {open ? "Hide transactions" : "Show transactions"}
        </button>
      )}

      {error && <p className="text-caption text-danger">{error}</p>}

      {open && (
        <ul className="mt-1 flex flex-col gap-2 border-t border-hairline pt-3">
          {transactions.length === 0 ? (
            <li className="text-caption text-muted">
              No month-to-date spend in this category yet.
            </li>
          ) : (
            transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 text-caption"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{t.description}</p>
                  <p className="text-caption text-muted">
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
