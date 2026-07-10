import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";
import { Dashboard } from "./dashboard";
import { ConnectBankButton } from "./connect-bank-button";
import { RefreshButton } from "./refresh-button";
import { SignOutButton } from "./sign-out-button";

// Smoke-test page: proves passkey session -> server-side Convex -> data.
// The session token stays in the httpOnly cookie; it never reaches browser JS.
export default async function Home() {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) redirect("/login");

  const convex = convexServerClient();
  const [accounts, totalBalance] = await Promise.all([
    convex.query(api.accounts.list, { sessionToken }),
    convex.query(api.accounts.totalBalance, { sessionToken }),
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
      <Dashboard accounts={accounts} totalBalance={totalBalance} />
    </main>
  );
}
