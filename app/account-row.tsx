"use client";

import { useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";

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
  mtdTransactions: AccountTxn[];
};

export function AccountRow({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const isLiability = account.type === "credit" || account.type === "loan";
  const txns = account.mtdTransactions ?? [];
  const canExpand = !account.isBalanceOnly;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {canExpand ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 items-start gap-2 text-left"
            aria-expanded={open}
          >
            <span
              className="mt-0.5 inline-block shrink-0 text-faint transition-transform"
              style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
              aria-hidden
            >
              ▸
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{account.name}</span>
              <span className="block text-caption text-muted">
                {account.institutionName}
                {account.mask ? ` ···${account.mask}` : ""}
                {txns.length > 0 && (
                  <span className="text-subtle">
                    {" "}
                    · {txns.length} this month
                  </span>
                )}
              </span>
              {account.availableBalance != null &&
                account.availableBalance !== account.currentBalance && (
                  <span className="block text-caption text-subtle">
                    {usd.format(account.availableBalance)} available
                  </span>
                )}
            </span>
          </button>
        ) : (
          <div className="min-w-0">
            <p className="font-medium">{account.name}</p>
            <p className="text-caption text-muted">
              {account.institutionName}
              {account.mask ? ` ···${account.mask}` : ""}
              {" · balance-only"}
            </p>
          </div>
        )}
        <p className="shrink-0 tabular-nums">
          {isLiability ? "−" : ""}
          {usd.format(account.currentBalance)}
        </p>
      </div>

      {open && canExpand && (
        <ul className="mt-1 flex flex-col gap-2 border-t border-hairline pt-3">
          {txns.length === 0 ? (
            <li className="text-sm text-zinc-500">
              No month-to-date Transactions on this Account.
            </li>
          ) : (
            txns.map((t) => {
              const income = t.amount < 0;
              return (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-caption text-muted">
                      {t.date}
                      {t.isTransfer
                        ? " · Transfer"
                        : t.categoryName
                          ? ` · ${t.categoryName}`
                          : ""}
                      {t.pending ? " · pending" : ""}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 tabular-nums ${
                      income
                        ? "text-emerald-700 dark:text-emerald-400"
                        : t.isTransfer
                          ? "text-subtle"
                          : ""
                    }`}
                  >
                    {income
                      ? `+${usd.format(-t.amount)}`
                      : usd.format(t.amount)}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
