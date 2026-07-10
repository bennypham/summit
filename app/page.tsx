// Authenticated home: server-fetches accounts + budgets from Convex, then renders.
// Connect / Refresh are client components that talk to /api/plaid/* and reload.
// Session token stays in the httpOnly cookie — never handed to browser JS.

import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";
import { Dashboard } from "./dashboard";
import { ConnectBankButton } from "./connect-bank-button";
import { RefreshButton } from "./refresh-button";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) redirect("/login");

  const convex = convexServerClient();

  // Backfill default Categories/Budgets for Items connected before this feature.
  await convex.mutation(api.budgets.ensureDefaults, { sessionToken });

  const [accounts, totalBalance, budgetSummary] = await Promise.all([
    convex.query(api.accounts.list, { sessionToken }),
    convex.query(api.accounts.totalBalance, { sessionToken }),
    convex.query(api.budgets.summary, { sessionToken }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Summit</h1>
        <div className="flex items-center gap-2">
          <ConnectBankButton />
          <RefreshButton />
          <SignOutButton />
        </div>
      </header>
      <Dashboard
        accounts={accounts}
        totalBalance={totalBalance}
        budgetMonth={budgetSummary.month}
        budgetCategories={budgetSummary.categories}
      />
    </main>
  );
}
