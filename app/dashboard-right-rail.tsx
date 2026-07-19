"use client";

import { useMemo, useState } from "react";
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

type AccountGroupKey = "cash" | "investments" | "creditLoans";

const ACCOUNT_GROUPS: {
  key: AccountGroupKey;
  label: string;
  dotClass: string;
  types: Account["type"][];
}[] = [
  {
    key: "cash",
    label: "Cash & checking",
    dotClass: "bg-accent",
    types: ["checking", "savings"],
  },
  {
    key: "investments",
    label: "Investments",
    dotClass: "bg-grass",
    types: ["brokerage"],
  },
  {
    key: "creditLoans",
    label: "Credit & loans",
    dotClass: "bg-grape",
    types: ["credit", "loan"],
  },
];

const ACCOUNTS_PREVIEW_LIMIT = 2;

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
    <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-[372px] lg:max-h-full">
      <div className="flex flex-col gap-3.5 rounded-lg bg-ink p-4">
        <p className="text-label-caps text-dark-muted">
          TOTAL BALANCE
        </p>
        <p className="text-[44px] font-extrabold leading-[46px] tracking-display text-surface tabular-nums">
          {usd.format(totalBalance)}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1 rounded-[16px] bg-surface px-5 py-[18px]">
          <span className="text-list-secondary font-semibold text-muted">
            In · {monthShort}
          </span>
          <span className="font-mono text-[20px] font-bold leading-4 text-success tabular-nums">
            +{usdCompact.format(mtdIn)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-[16px] bg-surface px-5 py-[18px]">
          <span className="text-list-secondary font-semibold text-muted">
            Out · {monthShort}
          </span>
          <span className="font-mono text-[20px] font-bold leading-4 text-danger tabular-nums">
            −{usdCompact.format(mtdOut)}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-section-title text-ink">
            Budgets
          </h3>
          <span
            className="text-list-secondary font-semibold text-muted"
            suppressHydrationWarning
          >
            {daysLeft} days left
          </span>
        </div>
        {widgetBudgets.length === 0 ? (
          <p className="text-list-secondary text-muted">
            Connect a bank and refresh to seed budgets.
          </p>
        ) : (
          widgetBudgets.map((row) => (
            <BudgetBar key={row.categoryId} row={row} />
          ))
        )}
      </div>

      <GroupedAccounts accounts={accounts} />
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
        <span className="text-list-secondary font-semibold text-body">{label}</span>
        <span
          className={`text-mono-amount-sm ${
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

function GroupedAccounts({ accounts }: { accounts: Account[] }) {
  const [expanded, setExpanded] = useState<Record<AccountGroupKey, boolean>>({
    cash: false,
    investments: false,
    creditLoans: false,
  });

  const groups = useMemo(() => groupAccounts(accounts), [accounts]);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-3.5 rounded-lg bg-surface p-4">
        <h3 className="text-section-title text-ink">
          Accounts
        </h3>
        <p className="text-list-secondary text-muted">
          No accounts linked yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h3 className="text-section-title text-ink">
        Accounts
      </h3>
      {groups.map((group, index) => (
        <AccountGroupSection
          key={group.key}
          group={group}
          expanded={expanded[group.key]}
          onToggle={() =>
            setExpanded((prev) => ({
              ...prev,
              [group.key]: !prev[group.key],
            }))
          }
          showDivider={index > 0}
        />
      ))}
    </div>
  );
}

function AccountGroupSection({
  group,
  expanded,
  onToggle,
  showDivider,
}: {
  group: GroupedAccountSection;
  expanded: boolean;
  onToggle: () => void;
  showDivider: boolean;
}) {
  const hiddenCount = Math.max(0, group.accounts.length - ACCOUNTS_PREVIEW_LIMIT);
  const visible = expanded
    ? group.accounts
    : group.accounts.slice(0, ACCOUNTS_PREVIEW_LIMIT);

  return (
    <section
      className={`flex flex-col gap-2 ${showDivider ? "border-t border-hairline pt-3" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-faint">
          {group.label}
        </span>
        <span
          className={`text-mono-amount-sm font-semibold ${
            group.key === "creditLoans" ? "text-danger" : "text-body"
          }`}
        >
          {usdCompact.format(group.subtotal)}
        </span>
      </div>
      {visible.map((account) => (
        <GroupedAccountRow
          key={account._id}
          account={account}
          dotClass={group.dotClass}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="pt-0.5 text-left text-list-secondary font-semibold text-accent"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </section>
  );
}

function GroupedAccountRow({
  account,
  dotClass,
}: {
  account: Account;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate text-list-secondary font-semibold text-ink">
        {account.name}
      </p>
      <p className="text-mono-amount-sm shrink-0 font-semibold text-ink">
        {usdCompact.format(account.currentBalance)}
      </p>
    </div>
  );
}

type GroupedAccountSection = {
  key: AccountGroupKey;
  label: string;
  dotClass: string;
  subtotal: number;
  accounts: Account[];
};

function groupAccounts(accounts: Account[]): GroupedAccountSection[] {
  const byKey = new Map<AccountGroupKey, Account[]>(
    ACCOUNT_GROUPS.map((g) => [g.key, []]),
  );

  for (const account of accounts) {
    const group = ACCOUNT_GROUPS.find((g) => g.types.includes(account.type));
    if (!group) continue;
    byKey.get(group.key)?.push(account);
  }

  return ACCOUNT_GROUPS.map((group) => {
    const list = (byKey.get(group.key) ?? []).sort(
      (a, b) => b.currentBalance - a.currentBalance,
    );
    const subtotal = list.reduce((sum, a) => sum + a.currentBalance, 0);
    return {
      key: group.key,
      label: group.label,
      dotClass: group.dotClass,
      subtotal,
      accounts: list,
    };
  }).filter((g) => g.accounts.length > 0);
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
