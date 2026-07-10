import { Doc } from "@/convex/_generated/dataModel";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type Account = Doc<"accounts"> & { institutionName: string };

export function Dashboard({
  accounts,
  totalBalance,
}: {
  accounts: Account[];
  totalBalance: number;
}) {
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
              {account.type === "credit" || account.type === "loan" ? "−" : ""}
              {usd.format(account.currentBalance)}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
