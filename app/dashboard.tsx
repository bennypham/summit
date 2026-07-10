import { Doc, Id } from "@/convex/_generated/dataModel";
import { BudgetRow } from "./budget-row";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type Account = Doc<"accounts"> & { institutionName: string };

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

/** Presentational dashboard — data is already fetched server-side in page.tsx. */
export function Dashboard({
  accounts,
  totalBalance,
  budgetMonth,
  budgetCategories,
}: {
  accounts: Account[];
  totalBalance: number;
  budgetMonth: string;
  budgetCategories: BudgetCategory[];
}) {
  const monthLabel = formatMonthLabel(budgetMonth);

  return (
    <>
      <section>
        <p className="text-sm text-zinc-500">Total balance</p>
        <p className="text-4xl font-semibold tabular-nums">
          {usd.format(totalBalance)}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Accounts</h2>
        {accounts.length === 0 && (
          <p className="text-zinc-500">
            No accounts yet. Connect a Sandbox institution with the button above
            (try First Platypus Bank).
          </p>
        )}
        {accounts.map((account) => (
          <div
            key={account._id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-zinc-500">
                {account.institutionName}
                {account.mask ? ` ••${account.mask}` : ""}
                {account.isBalanceOnly ? " · balance only" : ""}
              </p>
            </div>
            <p className="tabular-nums">
              {/* Credit/loan are liabilities — show a minus for clarity. */}
              {account.type === "credit" || account.type === "loan" ? "−" : ""}
              {usd.format(account.currentBalance)}
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Budgets</h2>
          <p className="text-xs text-zinc-400">
            {monthLabel} · month to date · click a category to see transactions
          </p>
        </div>
        {budgetCategories.length === 0 ? (
          <p className="text-zinc-500">
            No budgets yet. Connect a Sandbox bank and hit Refresh to seed
            default category budgets.
          </p>
        ) : (
          budgetCategories.map((row) => (
            <BudgetRow key={row.categoryId} {...row} />
          ))
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
