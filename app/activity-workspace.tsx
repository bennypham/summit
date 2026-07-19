"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ActivityFeed, type ActivityFilter } from "./activity-feed";
import { AppShell } from "./app-shell";
import { DashboardRightRail } from "./dashboard-right-rail";
import { EditActivityModal } from "./edit-activity-modal";
import {
  formatSyncLabel,
  type Account,
  type SyncItem,
} from "./dashboard-sections";

export type ActivityTransaction = {
  id: Id<"transactions">;
  date: string;
  description: string;
  amount: number;
  pending: boolean;
  isTransfer: boolean;
  categoryId?: Id<"categories">;
  categoryName?: string;
  accountName: string;
  institutionName: string;
  accountMask?: string;
};

export type ActivityPage = {
  transactions: ActivityTransaction[];
  totalCount: number;
  continueCursor: string | null;
  isDone: boolean;
  pageSize: number;
  nextPageSize: number;
  pageRange: { newest: string; oldest: string } | null;
  nextPageRange: { newest: string; oldest: string } | null;
};

export type CategoryOption = {
  _id: Id<"categories">;
  name: string;
};

type ActivityWorkspaceProps = {
  accounts: Account[];
  totalBalance: number;
  items: SyncItem[];
  budgetMonth: string;
  budgetCategories: {
    categoryId: Id<"categories">;
    categoryName: string;
    monthlyLimit: number;
    mtdSpend: number;
    remaining: number;
    percentUsed: number;
  }[];
  mtdIn: number;
  mtdOut: number;
  initialActivity: ActivityPage;
  categories: CategoryOption[];
};

export function ActivityWorkspace(props: ActivityWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedId, setSelectedId] = useState<Id<"transactions"> | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const [transactions, setTransactions] = useState(
    props.initialActivity.transactions,
  );
  const [totalCount, setTotalCount] = useState(props.initialActivity.totalCount);
  const [continueCursor, setContinueCursor] = useState(
    props.initialActivity.continueCursor,
  );
  const [isDone, setIsDone] = useState(props.initialActivity.isDone);
  const [nextPageSize, setNextPageSize] = useState(
    props.initialActivity.nextPageSize,
  );
  const [nextPageRange, setNextPageRange] = useState(
    props.initialActivity.nextPageRange,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  // Sync from server when RSC refresh lands a new first page (e.g. after edit).
  useEffect(() => {
    if (filter !== "all" || search.trim()) return;
    setTransactions(props.initialActivity.transactions);
    setTotalCount(props.initialActivity.totalCount);
    setContinueCursor(props.initialActivity.continueCursor);
    setIsDone(props.initialActivity.isDone);
    setNextPageSize(props.initialActivity.nextPageSize);
    setNextPageRange(props.initialActivity.nextPageRange);
  }, [props.initialActivity, filter, search]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const syncErrored = props.items.some((i) => i.status === "error");
  const syncLabel = formatSyncLabel(props.items);

  const headerSubtitle = syncErrored
    ? (syncLabel ?? "Sync error")
    : `${props.accounts.length} account${props.accounts.length === 1 ? "" : "s"} synced`;

  const searchActive = search.trim().length > 0;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const haystack = [
        t.description,
        t.categoryName,
        t.accountName,
        t.institutionName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, search]);

  const selected = transactions.find((t) => t.id === selectedId) ?? null;

  async function fetchPage(opts: {
    filter: ActivityFilter;
    cursor?: string | null;
    append: boolean;
  }) {
    const id = ++requestId.current;
    const params = new URLSearchParams({
      filter: opts.filter,
      limit: "30",
    });
    if (opts.cursor) params.set("cursor", opts.cursor);

    const res = await fetch(`/api/activity?${params}`);
    if (!res.ok) {
      throw new Error("Failed to load activity");
    }
    const page = (await res.json()) as ActivityPage;
    if (id !== requestId.current) return null;
    return page;
  }

  async function changeFilter(next: ActivityFilter) {
    if (next === filter) return;
    setFilter(next);
    setSelectedId(null);
    setHighlightedIds(new Set());
    setReloading(true);
    try {
      const page = await fetchPage({ filter: next, append: false });
      if (!page) return;
      setTransactions(page.transactions);
      setTotalCount(page.totalCount);
      setContinueCursor(page.continueCursor);
      setIsDone(page.isDone);
      setNextPageSize(page.nextPageSize);
      setNextPageRange(page.nextPageRange);
    } catch {
      // Keep prior list; user can retry by switching filters again.
    } finally {
      setReloading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || isDone || !continueCursor || searchActive) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage({
        filter,
        cursor: continueCursor,
        append: true,
      });
      if (!page) return;

      const newIds = new Set(page.transactions.map((t) => t.id));
      setTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const appended = page.transactions.filter((t) => !seen.has(t.id));
        return [...prev, ...appended];
      });
      setTotalCount(page.totalCount);
      setContinueCursor(page.continueCursor);
      setIsDone(page.isDone);
      setNextPageSize(page.nextPageSize);
      setNextPageRange(page.nextPageRange);
      setHighlightedIds(newIds);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => {
        setHighlightedIds(new Set());
      }, 1200);
    } catch {
      // Leave list as-is; button returns to resting.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <AppShell
      search={search}
      onSearchChange={setSearch}
      headerSubtitle={headerSubtitle}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ActivityFeed
            transactions={visible}
            filter={filter}
            onFilterChange={(f) => void changeFilter(f)}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClearFilters={() => {
              void changeFilter("all");
              setSearch("");
            }}
            totalCount={totalCount}
            isDone={isDone}
            loadingMore={loadingMore}
            reloading={reloading}
            nextPageSize={nextPageSize}
            nextPageRange={nextPageRange}
            searchActive={searchActive}
            highlightedIds={highlightedIds}
            syncLabel={syncLabel}
            onLoadMore={() => void loadMore()}
          />
        </div>

        <DashboardRightRail
          totalBalance={props.totalBalance}
          mtdIn={props.mtdIn}
          mtdOut={props.mtdOut}
          budgetMonth={props.budgetMonth}
          budgetCategories={props.budgetCategories}
          accounts={props.accounts}
        />
      </div>

      {selected && (
        <EditActivityModal
          key={selected.id}
          transaction={selected}
          categories={props.categories}
          pending={pending}
          onClose={() => setSelectedId(null)}
          onSaved={() =>
            startTransition(() => {
              router.refresh();
            })
          }
        />
      )}
    </AppShell>
  );
}
