"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import type { ActivityTransaction } from "./activity-workspace";
import { ActivityTransactionIcon } from "./activity-icons";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export type ActivityFilter = "all" | "income" | "spending" | "transfers";

type DayGroup = {
  dateKey: string;
  label: string;
  totalSpend: number;
  items: ActivityTransaction[];
};

type DateRange = { newest: string; oldest: string };

type ActivityFeedProps = {
  transactions: ActivityTransaction[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  selectedId: Id<"transactions"> | null;
  onSelect: (id: Id<"transactions">) => void;
  onClearFilters: () => void;
  totalCount: number;
  isDone: boolean;
  loadingMore: boolean;
  reloading: boolean;
  nextPageSize: number;
  nextPageRange: DateRange | null;
  searchActive: boolean;
  highlightedIds: Set<string>;
  syncLabel: string | null;
  onLoadMore: () => void;
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
  totalCount,
  isDone,
  loadingMore,
  reloading,
  nextPageSize,
  nextPageRange,
  searchActive,
  highlightedIds,
  syncLabel,
  onLoadMore,
}: ActivityFeedProps) {
  const groups = useMemo(() => groupByDate(transactions), [transactions]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef(new Map<string, HTMLElement>());
  const [stickyLabel, setStickyLabel] = useState<string | null>(null);

  // Reset scroll on filter / search, not when Load More appends rows.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
    setStickyLabel(null);
  }, [filter, searchActive]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || groups.length === 0) {
      setStickyLabel(null);
      return;
    }

    function updateSticky() {
      const root = scrollRef.current;
      if (!root) return;

      const rootRect = root.getBoundingClientRect();
      let active: DayGroup | null = null;

      for (const group of groups) {
        const header = headerRefs.current.get(group.dateKey);
        if (!header) continue;
        if (header.getBoundingClientRect().top <= rootRect.top + 1) {
          active = group;
        } else {
          break;
        }
      }

      if (!active) {
        setStickyLabel(null);
        return;
      }

      const header = headerRefs.current.get(active.dateKey);
      if (!header) {
        setStickyLabel(null);
        return;
      }

      const headerRect = header.getBoundingClientRect();
      const fullyVisible =
        headerRect.top >= rootRect.top - 0.5 &&
        headerRect.bottom <= rootRect.bottom + 0.5;

      setStickyLabel(fullyVisible ? null : active.label);
    }

    updateSticky();
    scroller.addEventListener("scroll", updateSticky, { passive: true });
    const resizeObserver = new ResizeObserver(updateSticky);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateSticky);
      resizeObserver.disconnect();
    };
  }, [groups]);

  const loadedRange = useMemo(() => {
    if (transactions.length === 0) return null;
    return {
      newest: transactions[0]!.date,
      oldest: transactions[transactions.length - 1]!.date,
    };
  }, [transactions]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-lg bg-surface p-4">
      <div className="flex shrink-0 items-center justify-between px-1 pb-3.5">
        <h2 className="text-heading font-extrabold tracking-heading text-ink">
          Activity
        </h2>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1 pb-4">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={active ? "chip chip-dark" : "chip"}
              disabled={reloading}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wash text-2xl text-muted">
            ⌕
          </div>
          <p className="text-heading font-bold text-ink">No transactions found</p>
          <p className="max-w-xs text-caption font-medium text-muted">
            Try a different search or filter to see activity.
          </p>
          <button type="button" onClick={onClearFilters} className="btn-ghost">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          {stickyLabel && (
            <div
              className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2"
              aria-hidden
            >
              <StickyDatePill label={stickyLabel} />
            </div>
          )}

          <div ref={scrollRef} className="h-full overflow-y-auto">
            {groups.map((group, index) => (
              <section key={group.dateKey} className="pb-2">
                <div
                  ref={(el) => {
                    if (el) headerRefs.current.set(group.dateKey, el);
                    else headerRefs.current.delete(group.dateKey);
                  }}
                  data-date-key={group.dateKey}
                  className={`flex items-center gap-3 px-1 pb-2 pt-3.5 ${
                    index === 0 ? "pt-0" : ""
                  }`}
                >
                  <span className="text-label-caps text-faint">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-hairline" />
                  {group.totalSpend > 0 && (
                    <span className="text-mono-amount-sm text-faint">
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
                      highlighted={highlightedIds.has(t.id)}
                      onSelect={() => onSelect(t.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}

            <ActivityPaginationFooter
              loadedCount={transactions.length}
              totalCount={totalCount}
              loadedRange={loadedRange}
              isDone={isDone}
              loadingMore={loadingMore}
              nextPageSize={nextPageSize}
              nextPageRange={nextPageRange}
              searchActive={searchActive}
              syncLabel={syncLabel}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityPaginationFooter({
  loadedCount,
  totalCount,
  loadedRange,
  isDone,
  loadingMore,
  nextPageSize,
  nextPageRange,
  searchActive,
  syncLabel,
  onLoadMore,
}: {
  loadedCount: number;
  totalCount: number;
  loadedRange: DateRange | null;
  isDone: boolean;
  loadingMore: boolean;
  nextPageSize: number;
  nextPageRange: DateRange | null;
  searchActive: boolean;
  syncLabel: string | null;
  onLoadMore: () => void;
}) {
  if (searchActive) {
    return (
      <div className="mt-2 flex flex-col items-center gap-3 border-t border-hairline px-1 pb-2 pt-4">
        <p className="text-[12px] font-medium leading-3 text-muted">
          Showing {loadedCount} matching
        </p>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 border-t border-hairline px-1 pb-2 pt-[18px]">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-tint-green">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M20 6 9 17l-5-5"
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-caption font-semibold leading-4 text-ink">
          That&apos;s everything
        </p>
        <p className="text-[12px] leading-3 text-muted">
          {totalCount} transaction{totalCount === 1 ? "" : "s"}
          {syncLabel ? ` · ${syncLabel}` : ""}
        </p>
      </div>
    );
  }

  const statusRange = loadedRange ? formatShortRange(loadedRange) : null;
  const loadCount = Math.max(1, nextPageSize);
  const loadingRange = nextPageRange ? formatShortRange(nextPageRange) : null;

  return (
    <div className="mt-2 flex flex-col items-center gap-3 border-t border-hairline px-1 pb-2 pt-4">
      <p className="text-[12px] font-medium leading-3 text-muted">
        Showing {loadedCount} of {totalCount}
        {statusRange ? ` · ${statusRange}` : ""}
      </p>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loadingMore}
        className={`flex h-11 w-full items-center justify-center gap-[9px] rounded-[10px] bg-tint-blue text-[14px] font-bold leading-[18px] text-accent transition-opacity ${
          loadingMore ? "opacity-75" : "hover:opacity-90"
        }`}
      >
        {loadingMore ? (
          <>
            <LoadMoreSpinner />
            <span>
              Loading {loadCount} more
              {loadingRange ? ` · ${loadingRange}` : ""}
            </span>
          </>
        ) : (
          <span>Load {loadCount} more</span>
        )}
      </button>
    </div>
  );
}

function LoadMoreSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className="shrink-0 animate-spin"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="#C9DCFC"
        strokeWidth="3"
      />
      <path
        d="M12 3a9 9 0 0 1 8.49 6"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StickyDatePill({ label }: { label: string }) {
  return (
    <div className="flex h-[26px] items-center justify-center rounded-full bg-ink px-[14px] shadow-[0_4px_12px_rgb(23_23_26_/_0.18)]">
      <span className="whitespace-nowrap text-[11px] font-bold leading-[14px] tracking-[0.08em] text-surface">
        {label}
      </span>
    </div>
  );
}

function ActivityRow({
  transaction: t,
  selected,
  highlighted,
  onSelect,
}: {
  transaction: ActivityTransaction;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const income = t.amount < 0;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3.5 rounded-[10px] px-1 py-[11px] text-left transition-colors duration-[1200ms] ease-out ${
          highlighted
            ? "bg-tint-blue"
            : selected
              ? "bg-tint-selected"
              : "bg-transparent hover:bg-wash/60"
        }`}
      >
        <ActivityTransactionIcon transaction={t} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-list-primary text-ink">
            {t.description}
          </p>
          <p className="truncate text-list-secondary text-muted">
            {formatMeta(t)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-mono-amount ${
              income ? "text-success" : "text-ink"
            }`}
          >
            {income
              ? `+${usd.format(-t.amount)}`
              : `−${usd.format(t.amount)}`}
          </p>
          <p className="text-list-secondary text-faint">
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
    t.isTransfer ? "Transfer" : (t.categoryName ?? (income ? "Income" : null)),
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

function formatShortRange(range: DateRange) {
  const newest = formatShortDay(range.newest);
  const oldest = formatShortDay(range.oldest);
  if (newest === oldest) return newest;
  return `${newest} – ${oldest}`;
}

function formatShortDay(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(transactions: ActivityTransaction[]): DayGroup[] {
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
