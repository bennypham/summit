"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSessionToken } from "./providers";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Smoke-test page: proves browser -> passkey session -> Convex -> data.
// The real dashboard replaces this in a later PR.
export default function Home() {
  const sessionToken = useSessionToken();
  const accounts = useQuery(
    api.accounts.list,
    sessionToken ? { sessionToken } : "skip",
  );
  const totalBalance = useQuery(
    api.accounts.totalBalance,
    sessionToken ? { sessionToken } : "skip",
  );

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Summit</h1>
        <button
          onClick={signOut}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </header>

      <section>
        <p className="text-sm text-zinc-500">Total balance</p>
        <p className="text-4xl font-semibold tabular-nums">
          {totalBalance === undefined ? "—" : usd.format(totalBalance)}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Accounts</h2>
        {accounts === undefined && <p className="text-zinc-500">Loading…</p>}
        {accounts?.length === 0 && (
          <p className="text-zinc-500">
            No accounts yet. Run the seed script:{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
              npx convex run seed:run
            </code>
          </p>
        )}
        {accounts?.map((account) => (
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
              {account.type === "credit" ? "−" : ""}
              {usd.format(account.currentBalance)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
