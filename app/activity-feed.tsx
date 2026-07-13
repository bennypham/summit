"use client";

import { Id } from "@/convex/_generated/dataModel";
import type { ActivityTransaction } from "./activity-workspace";
import { ActivityTransactionIcon } from "./activity-icons";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export type ActivityFilter = "all" | "income" | "spending" | "transfers";

type ActivityFeedProps = {
  transactions: ActivityTransaction[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  selectedId: Id<"transactions"> | null;
  onSelect: (id: Id<"transactions">) => void;
  onClearFilters: () => void;
};

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "income", label: "Income" },
  { id: "spending", label: "Spending" },
  { id: "transfers", label: "Transfers" },
];

export function ActivityFeed({
  transactions,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  onClearFilters,
}: ActivityFeedProps) {
  const groups = groupByDate(transactions);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-surface p-4">
      <div className="flex items-center justify-between px-1 pb-3.5">
        <h2 className="text-heading font-extrabold tracking-heading text-ink">
          Activity
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 pb-4">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={active ? "chip chip-dark" : "chip"}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wash text-2xl text-muted">
            ⌕
          </div>
          <p className="text-heading font-bold text-ink">No transactions found</p>
          <p className="max-w-xs text-caption font-medium text-muted">
            Try a different search or filter to see activity this month.
          </p>
          <button type="button" onClick={onClearFilters} className="btn-ghost">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.dateKey} className="pb-2">
              <div className="flex items-center gap-3 px-1 pb-2 pt-3.5 first:pt-0">
                <span className="text-[12px] font-bold tracking-caps text-faint">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-hairline" />
                {group.totalSpend > 0 && (
                  <span className="font-mono text-[12px] font-medium text-faint tabular-nums">
                    −{usd.format(group.totalSpend)}
                  </span>
                )}
              </div>
              <ul>
                {group.items.map((t) => (
                  <ActivityRow
                    key={t.id}
                    transaction={t}
                    selected={t.id === selectedId}
                    onSelect={() => onSelect(t.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  transaction: t,
  selected,
  onSelect,
}: {
  transaction: ActivityTransaction;
  selected: boolean;
  onSelect: () => void;
}) {
  const income = t.amount < 0;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3.5 rounded-md px-1 py-[11px] text-left transition-colors duration-fast ${
          selected ? "bg-tint-selected" : "hover:bg-wash/60"
        }`}
      >
        <ActivityTransactionIcon transaction={t} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold leading-5 text-ink">
            {t.description}
          </p>
          <p className="truncate text-caption font-medium text-muted">
            {formatMeta(t)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-mono text-[15px] font-semibold tabular-nums ${
              income ? "text-success" : "text-ink"
            }`}
          >
            {income
              ? `+${usd.format(-t.amount)}`
              : `−${usd.format(t.amount)}`}
          </p>
          <p className="text-[12px] font-medium text-faint">
            {t.pending ? "Pending" : formatRowDate(t.date)}
          </p>
        </div>
      </button>
    </li>
  );
}

function formatMeta(t: ActivityTransaction) {
  const income = t.amount < 0;
  const parts = [
    t.isTransfer ? "Transfer" : t.categoryName ?? (income ? "Income" : null),
    t.institutionName,
    t.accountMask ? `·· ${t.accountMask}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatRowDate(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (dateKey === formatDateKey(new Date())) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(transactions: ActivityTransaction[]) {
  const map = new Map<string, ActivityTransaction[]>();
  for (const t of transactions) {
    const key = t.date;
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      totalSpend: items.reduce(
        (sum, t) =>
          t.amount > 0 && !t.isTransfer && !t.pending ? sum + t.amount : sum,
        0,
      ),
      items,
    }));
}

function formatDayLabel(dateKey: string) {
  const todayKey = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  if (dateKey === todayKey) return "TODAY";
  if (dateKey === yesterdayKey) return "YESTERDAY";

  const d = new Date(`${dateKey}T12:00:00`);
  return d
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

