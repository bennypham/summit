"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Id } from "@/convex/_generated/dataModel";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function BudgetRow({
  categoryId,
  categoryName,
  monthlyLimit,
  mtdSpend,
  remaining,
  percentUsed,
}: {
  categoryId: Id<"categories">;
  categoryName: string;
  monthlyLimit: number;
  mtdSpend: number;
  remaining: number;
  percentUsed: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(monthlyLimit));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const over = remaining < 0;
  const barWidth = Math.min(Math.max(percentUsed, 0), 100);

  async function save() {
    setError(null);
    const monthlyLimit = Number(draft);
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
      setError("Enter a valid amount");
      return;
    }
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyLimit }),
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
        <p className="font-medium">{categoryName}</p>
        <p className="text-sm tabular-nums text-zinc-500">
          {usd.format(mtdSpend)}
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

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{Math.round(percentUsed)}% used</span>
        <span className={over ? "text-red-600 dark:text-red-400" : undefined}>
          {over
            ? `${usd.format(-remaining)} over`
            : `${usd.format(remaining)} left`}
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
