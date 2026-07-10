// Authenticated home: server-fetches accounts + budgets from Convex, then renders.
// Connect / Refresh are client components that talk to /api/plaid/* and reload.
// Session token stays in the httpOnly cookie — never handed to browser JS.

import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";
import { ActivityWorkspace } from "./activity-workspace";

export default async function Home() {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) redirect("/login");

  const convex = convexServerClient();

  // Backfill default Categories/Budgets for Items connected before this feature.
  await convex.mutation(api.budgets.ensureDefaults, { sessionToken });

  const [
    accounts,
    totalBalance,
    items,
    budgetSummary,
    activity,
    categories,
  ] = await Promise.all([
    convex.query(api.accounts.list, { sessionToken }),
    convex.query(api.accounts.totalBalance, { sessionToken }),
    convex.query(api.items.list, { sessionToken }),
    convex.query(api.budgets.summary, { sessionToken }),
    convex.query(api.transactions.listActivity, { sessionToken }),
    convex.query(api.categories.list, { sessionToken }),
  ]);

  return (
    <ActivityWorkspace
      accounts={accounts}
      totalBalance={totalBalance}
      items={items}
      budgetMonth={budgetSummary.month}
      budgetCategories={budgetSummary.categories}
      unbudgetedCategories={budgetSummary.unbudgeted}
      budgetTotals={budgetSummary.totals}
      activityMonth={activity.month}
      transactions={activity.transactions}
      categories={categories}
    />
  );
}
