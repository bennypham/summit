"use client";

import { Id } from "@/convex/_generated/dataModel";
import type { Account } from "./dashboard-sections";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

type BudgetCategory = {
  categoryId: Id<"categories">;
  categoryName: string;
  monthlyLimit: number;
  mtdSpend: number;
  percentUsed: number;
};

type DashboardRightRailProps = {
  totalBalance: number;
  mtdIn: number;
  mtdOut: number;
  budgetMonth: string;
  budgetCategories: BudgetCategory[];
  accounts: Account[];
};

const BUDGET_WIDGET_ORDER = [
  "Groceries",
  "Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Subscriptions",
  "Rent",
] as const;

const BUDGET_WIDGET_LIMIT = 5;

const BUDGET_BAR_COLORS: Record<string, string> = {
  Groceries: "bg-grass",
  Dining: "bg-tangerine",
  Transportation: "bg-grape",
  Entertainment: "bg-lemon",
  Shopping: "bg-bubblegum",
  Subscriptions: "bg-accent",
  Rent: "bg-tangerine",
};

const ACCOUNT_AVATAR_COLORS = ["bg-accent", "bg-danger", "bg-ink", "bg-grape"];

export function DashboardRightRail({
  totalBalance,
  mtdIn,
  mtdOut,
  budgetMonth,
  budgetCategories,
  accounts,
}: DashboardRightRailProps) {
  const monthShort = formatMonthShort(budgetMonth);
  const daysLeft = daysLeftInMonth();
  const widgetBudgets = pickBudgetWidgetCategories(budgetCategories);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[372px]">
      <div className="flex flex-col gap-3.5 rounded-lg bg-ink p-4">
        <p className="text-[12px] font-bold tracking-caps text-dark-muted">
          TOTAL BALANCE
        </p>
        <p className="text-[44px] font-extrabold leading-[46px] tracking-display text-surface tabular-nums">
          {usd.format(totalBalance)}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1 rounded-[16px] bg-surface px-5 py-[18px]">
          <span className="text-caption font-semibold text-muted">
            In · {monthShort}
          </span>
          <span className="font-mono text-[20px] font-bold leading-4 text-success tabular-nums">
            +{usdCompact.format(mtdIn)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-[16px] bg-surface px-5 py-[18px]">
          <span className="text-caption font-semibold text-muted">
            Out · {monthShort}
          </span>
          <span className="font-mono text-[20px] font-bold leading-4 text-danger tabular-nums">
            −{usdCompact.format(mtdOut)}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold tracking-heading text-ink">
            Budgets
          </h3>
          <span className="text-caption font-semibold text-muted">
            {daysLeft} days left
          </span>
        </div>
        {widgetBudgets.length === 0 ? (
          <p className="text-caption font-medium text-muted">
            Connect a bank and refresh to seed budgets.
          </p>
        ) : (
          widgetBudgets.map((row) => (
            <BudgetBar key={row.categoryId} row={row} />
          ))
        )}
      </div>

      <div className="flex flex-col gap-3.5 rounded-lg bg-surface p-4">
        <h3 className="text-[17px] font-extrabold tracking-heading text-ink">
          Accounts
        </h3>
        {accounts.length === 0 ? (
          <p className="text-caption font-medium text-muted">
            No accounts linked yet.
          </p>
        ) : (
          accounts.map((account, i) => (
            <AccountRow key={account._id} account={account} index={i} />
          ))
        )}
      </div>
    </aside>
  );
}

function BudgetBar({ row }: { row: BudgetCategory }) {
  const over = row.mtdSpend > row.monthlyLimit;
  const pct = Math.min(100, Math.round(row.percentUsed));
  const barColor =
    BUDGET_BAR_COLORS[row.categoryName] ??
    (over ? "bg-bubblegum" : "bg-grass");
  const label = row.categoryName;

  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-body">{label}</span>
        <span
          className={`font-mono text-[12px] font-medium tabular-nums ${
            over ? "text-danger" : "text-muted"
          }`}
        >
          {usd.format(row.mtdSpend)} / {usd.format(row.monthlyLimit)}
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-wash">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: over ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AccountRow({ account, index }: { account: Account; index: number }) {
  const initials = account.institutionName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const avatarColor =
    ACCOUNT_AVATAR_COLORS[index % ACCOUNT_AVATAR_COLORS.length];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold text-surface ${avatarColor}`}
      >
        {initials || "AC"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink">{account.name}</p>
        <p className="text-[12px] font-medium text-muted">
          {account.mask ? `·· ${account.mask}` : account.institutionName}
        </p>
      </div>
      <p className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-ink">
        {usdCompact.format(account.currentBalance)}
      </p>
    </div>
  );
}

function formatMonthShort(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function daysLeftInMonth() {
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  return daysInMonth - now.getDate();
}

/** Paper widget order — Groceries / Dining / Transportation / Entertainment / Shopping. */
function pickBudgetWidgetCategories(categories: BudgetCategory[]) {
  const byName = new Map(categories.map((c) => [c.categoryName, c]));
  const picked: BudgetCategory[] = [];

  for (const name of BUDGET_WIDGET_ORDER) {
    const row = byName.get(name);
    if (row) picked.push(row);
  }

  const pickedIds = new Set(picked.map((c) => c.categoryId));
  const rest = categories
    .filter((c) => !pickedIds.has(c.categoryId))
    .sort(
      (a, b) =>
        b.mtdSpend - a.mtdSpend ||
        a.categoryName.localeCompare(b.categoryName),
    );

  for (const row of rest) {
    if (picked.length >= BUDGET_WIDGET_LIMIT) break;
    picked.push(row);
  }

  return picked.slice(0, BUDGET_WIDGET_LIMIT);
}
