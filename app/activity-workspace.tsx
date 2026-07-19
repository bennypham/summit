"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ActivityFeed, type ActivityFilter } from "./activity-feed";
import { AppShell } from "./app-shell";
import { DashboardRightRail } from "./dashboard-right-rail";
import { EditActivityModal } from "./edit-activity-modal";
import { formatSyncLabel, type Account, type SyncItem } from "./dashboard-sections";

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
  activityMonth: string;
  transactions: ActivityTransaction[];
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

  const syncErrored = props.items.some((i) => i.status === "error");
  const syncLabel = formatSyncLabel(props.items);

  const headerSubtitle = syncErrored
    ? syncLabel ?? "Sync error"
    : `${props.accounts.length} account${props.accounts.length === 1 ? "" : "s"} synced`;

  const { mtdIn, mtdOut } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of props.transactions) {
      if (t.pending) continue;
      if (t.amount < 0) inflow += -t.amount;
      else if (!t.isTransfer) outflow += t.amount;
    }
    return { mtdIn: inflow, mtdOut: outflow };
  }, [props.transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return props.transactions.filter((t) => {
      if (filter === "income" && (t.amount >= 0 || t.isTransfer)) return false;
      if (filter === "spending" && (t.amount <= 0 || t.isTransfer)) return false;
      if (filter === "transfers" && !t.isTransfer) return false;
      if (!q) return true;
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
  }, [props.transactions, search, filter]);

  const selected =
    props.transactions.find((t) => t.id === selectedId) ?? null;

  return (
    <AppShell
      search={search}
      onSearchChange={setSearch}
      headerSubtitle={headerSubtitle}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ActivityFeed
            transactions={filtered}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClearFilters={() => {
              setFilter("all");
              setSearch("");
            }}
          />
        </div>

        <DashboardRightRail
          totalBalance={props.totalBalance}
          mtdIn={mtdIn}
          mtdOut={mtdOut}
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
