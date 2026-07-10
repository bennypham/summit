import { Doc, Id } from "@/convex/_generated/dataModel";
import { AccountRow } from "./account-row";
import { BudgetRow } from "./budget-row";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type AccountTxn = {
  id: string;
  date: string;
  description: string;
  amount: number;
  pending: boolean;
  isTransfer: boolean;
  categoryName?: string;
};

type Account = Doc<"accounts"> & {
  institutionName: string;
  itemStatus: "active" | "error";
  itemErrorMessage?: string;
  lastSyncedAt?: number;
  mtdTransactions: AccountTxn[];
};

type BudgetCategory = {
  categoryId: Id<"categories">;
  categoryName: string;
  monthlyLimit: number;
  mtdSpend: number;
  remaining: number;
  percentUsed: number;
  transactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    accountName: string;
  }[];
};

type UnbudgetedCategory = {
  categoryId: string;
  categoryName: string;
  mtdSpend: number;
  transactions: BudgetCategory["transactions"];
};

type SyncItem = {
  _id: string;
  institutionName: string;
  status: "active" | "error";
  errorMessage?: string;
  lastSyncedAt?: number;
};

/** Presentational dashboard — data is already fetched server-side in page.tsx. */
export function Dashboard({
  accounts,
  totalBalance,
  items,
  budgetMonth,
  budgetCategories,
  unbudgetedCategories,
  budgetTotals,
}: {
  accounts: Account[];
  totalBalance: number;
  items: SyncItem[];
  budgetMonth: string;
  budgetCategories: BudgetCategory[];
  unbudgetedCategories: UnbudgetedCategory[];
  budgetTotals: {
    monthlyLimit: number;
    budgetedSpend: number;
    unbudgetedSpend: number;
  };
}) {
  const monthLabel = formatMonthLabel(budgetMonth);
  const syncLabel = formatSyncLabel(items);

  return (
    <>
      <section className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500">Total balance</p>
        <p className="text-4xl font-semibold tabular-nums">
          {usd.format(totalBalance)}
        </p>
        {syncLabel && (
          <p
            className={`text-xs ${
              items.some((i) => i.status === "error")
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400"
            }`}
          >
            {syncLabel}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Accounts</h2>
          <p className="text-xs text-zinc-400">
            click an Account for month-to-date activity
          </p>
        </div>
        {accounts.length === 0 && (
          <p className="text-zinc-500">
            No Accounts yet. Connect a Sandbox Institution above (try First
            Platypus Bank).
          </p>
        )}
        {accounts.map((account) => (
          <AccountRow key={account._id} account={account} />
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Budgets</h2>
          <p className="text-xs text-zinc-400">
            {monthLabel} · month to date
          </p>
        </div>
        {(budgetCategories.length > 0 || unbudgetedCategories.length > 0) && (
          <p className="text-xs text-zinc-500">
            {usd.format(budgetTotals.budgetedSpend)} of{" "}
            {usd.format(budgetTotals.monthlyLimit)} budgeted
            {budgetTotals.unbudgetedSpend > 0 && (
              <>
                {" · "}
                {usd.format(budgetTotals.unbudgetedSpend)} unbudgeted
              </>
            )}
          </p>
        )}
        {budgetCategories.length === 0 && unbudgetedCategories.length === 0 ? (
          <p className="text-zinc-500">
            No budgets yet. Connect a Sandbox Institution and hit Refresh to
            seed default Category budgets.
          </p>
        ) : (
          <>
            {budgetCategories.map((row) => (
              <BudgetRow
                key={row.categoryId}
                {...row}
                transactions={row.transactions ?? []}
              />
            ))}
            {unbudgetedCategories.map((row) => (
              <BudgetRow
                key={row.categoryId}
                categoryId={row.categoryId}
                categoryName={row.categoryName}
                monthlyLimit={null}
                mtdSpend={row.mtdSpend}
                transactions={row.transactions ?? []}
              />
            ))}
          </>
        )}
      </section>
    </>
  );
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatSyncLabel(items: SyncItem[]) {
  if (items.length === 0) return null;
  const errored = items.filter((i) => i.status === "error");
  if (errored.length > 0) {
    return errored
      .map(
        (i) =>
          `${i.institutionName} sync error${
            i.errorMessage ? `: ${i.errorMessage}` : ""
          }`,
      )
      .join(" · ");
  }
  const latest = items
    .map((i) => i.lastSyncedAt)
    .filter((t): t is number => typeof t === "number")
    .sort((a, b) => b - a)[0];
  if (!latest) return "Not synced yet";
  return `Last synced ${formatRelativeTime(latest)}`;
}

function formatRelativeTime(ts: number) {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
