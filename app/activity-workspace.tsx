"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "./app-shell";
import { Dashboard } from "./dashboard";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Quick-filter chips shown in the activity panel (Paper finance patterns). */
const FILTER_CHIP_NAMES = [
  "Groceries",
  "Dining",
  "Transportation",
  "Subscriptions",
  "Shopping",
  "Entertainment",
  "Rent",
] as const;

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
  accounts: Parameters<typeof Dashboard>[0]["accounts"];
  totalBalance: number;
  items: Parameters<typeof Dashboard>[0]["items"];
  budgetMonth: string;
  budgetCategories: Parameters<typeof Dashboard>[0]["budgetCategories"];
  unbudgetedCategories: Parameters<typeof Dashboard>[0]["unbudgetedCategories"];
  budgetTotals: Parameters<typeof Dashboard>[0]["budgetTotals"];
  activityMonth: string;
  transactions: ActivityTransaction[];
  categories: CategoryOption[];
};

export function ActivityWorkspace(props: ActivityWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategoryIds, setActiveCategoryIds] = useState<
    Set<Id<"categories">>
  >(new Set());
  const [selectedId, setSelectedId] = useState<Id<"transactions"> | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const filterChips = useMemo(() => {
    return FILTER_CHIP_NAMES.map((name) =>
      props.categories.find((c) => c.name === name),
    ).filter((c): c is CategoryOption => c != null);
  }, [props.categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return props.transactions.filter((t) => {
      if (activeCategoryIds.size > 0) {
        if (!t.categoryId || !activeCategoryIds.has(t.categoryId)) return false;
      }
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
  }, [props.transactions, search, activeCategoryIds]);

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    props.transactions.find((t) => t.id === selectedId) ??
    null;

  function toggleChip(categoryId: Id<"categories">) {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  return (
    <AppShell search={search} onSearchChange={setSearch}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Dashboard {...props} />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-faint">
                Activity
              </h2>
              <p className="text-sm text-muted">
                Tap a transaction to edit name and category
              </p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="w-full rounded-xl border-[1.5px] border-border-strong bg-field px-3.5 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent sm:hidden"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => {
              const active = activeCategoryIds.has(chip._id);
              return (
                <button
                  key={chip._id}
                  type="button"
                  onClick={() => toggleChip(chip._id)}
                  className={`rounded-full border-[1.5px] px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-accent bg-accent text-surface"
                      : "border-border-strong bg-field text-body hover:border-accent/40"
                  }`}
                >
                  {chip.name === "Transportation" ? "Transport" : chip.name}
                </button>
              );
            })}
            {activeCategoryIds.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryIds(new Set())}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <ActivityList
              transactions={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <EditActivityPanel
              key={selected?.id ?? "empty"}
              transaction={selected}
              categories={props.categories}
              pending={pending}
              onSaved={() =>
                startTransition(() => {
                  router.refresh();
                })
              }
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActivityList({
  transactions,
  selectedId,
  onSelect,
}: {
  transactions: ActivityTransaction[];
  selectedId: Id<"transactions"> | null;
  onSelect: (id: Id<"transactions">) => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-2">
      <p className="px-4 pb-3 pt-3 text-xs font-bold uppercase tracking-[0.1em] text-faint">
        Activity — tap to edit
      </p>
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="font-semibold text-ink">No transactions found</p>
          <p className="text-sm text-muted">
            Try a different search term or clear your filters.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {transactions.map((t) => {
            const selected = t.id === selectedId;
            const income = t.amount < 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`flex w-full items-center gap-3.5 rounded-md border-[1.5px] p-3.5 text-left transition-colors ${
                    selected
                      ? "border-accent bg-[#F5F8FD]"
                      : "border-transparent hover:bg-wash/60"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                      income
                        ? "bg-tint-green text-success"
                        : t.isTransfer
                          ? "bg-wash text-muted"
                          : "bg-tint-blue text-accent"
                    }`}
                  >
                    {t.description.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">
                      {t.description}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {t.institutionName}
                      {t.accountMask ? ` ·· ${t.accountMask}` : ""}
                      {t.categoryName ? ` · ${t.categoryName}` : ""}
                      {t.pending ? " · pending" : ""}
                      {t.isTransfer ? " · Transfer" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-mono text-[15px] font-bold tabular-nums ${
                        income
                          ? "text-success"
                          : t.isTransfer
                            ? "text-muted"
                            : "text-danger"
                      }`}
                    >
                      {income
                        ? `+${usd.format(-t.amount)}`
                        : `−${usd.format(t.amount)}`}
                    </p>
                    <p className="text-xs text-subtle">{t.date}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EditActivityPanel({
  transaction,
  categories,
  pending,
  onSaved,
}: {
  transaction: ActivityTransaction | null;
  categories: CategoryOption[];
  pending: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(
    transaction?.categoryId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  if (!transaction) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-border bg-surface p-6 text-center">
        <p className="font-semibold text-ink">Edit activity</p>
        <p className="mt-2 text-sm text-muted">
          Select a transaction from the list to change its name or category.
        </p>
      </div>
    );
  }

  const income = transaction.amount < 0;
  const editCategories = categories.filter((c) => c.name !== "Uncategorized");

  async function save() {
    setError(null);
    const res = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: transaction!.id,
        description: name,
        categoryId: transaction!.isTransfer ? null : categoryId,
      }),
    });
    if (!res.ok) {
      setError("Could not save changes");
      return;
    }
    setDirty(false);
    onSaved();
  }

  function reset() {
    setName(transaction!.description);
    setCategoryId(transaction!.categoryId ?? null);
    setError(null);
    setDirty(false);
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <p className="pb-4 text-xs font-bold uppercase tracking-[0.1em] text-faint">
        Edit activity
      </p>

      <div className="flex items-center gap-3 pb-5">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[15px] bg-tint-amber text-lg font-bold text-[#9A5A12]">
          {transaction.description.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-extrabold tracking-[-0.01em] text-ink">
            {transaction.description}
          </p>
          <p className="font-mono text-xs text-muted">
            {income
              ? `+${usd.format(-transaction.amount)}`
              : `−${usd.format(transaction.amount)}`}
            {" · "}
            {transaction.institutionName}
            {transaction.accountMask ? ` ·· ${transaction.accountMask}` : ""}
          </p>
        </div>
      </div>

      <label className="pb-2 text-xs font-semibold text-body">Name</label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setDirty(true);
        }}
        className="w-full rounded-md border-[1.5px] border-border-strong bg-field px-4 py-3 text-[15px] font-semibold text-ink outline-none focus:border-accent"
      />

      {!transaction.isTransfer && (
        <>
          <p className="pb-2 pt-4 text-xs font-semibold text-body">Category</p>
          <div className="flex flex-wrap gap-2">
            {editCategories.map((c) => {
              const active = categoryId === c._id;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c._id);
                    setDirty(true);
                  }}
                  className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "border-accent bg-accent text-surface"
                      : "border-border-strong bg-field text-body"
                  }`}
                >
                  {c.name === "Transportation" ? "Transport" : c.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {transaction.isTransfer && (
        <p className="pt-4 text-sm text-muted">
          Transfers keep their category excluded from budget math, but you can
          rename them.
        </p>
      )}

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => void save()}
          className="flex-1 rounded-md bg-accent py-3 text-[15px] font-bold text-surface shadow-[0_8px_18px_-8px_#2E7BF6] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={reset}
          className="rounded-md bg-wash px-5 py-3 text-[15px] font-bold text-body disabled:opacity-50"
        >
          Reset
        </button>
      </div>
      {error && <p className="pt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
