import { authedQuery } from "./functions";

function currentMonthRange() {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { month, monthStart, nextMonth };
}

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { monthStart, nextMonth } = currentMonthRange();
    const [accounts, categories, monthTxns] = await Promise.all([
      ctx.db.query("accounts").collect(),
      ctx.db.query("categories").collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          q.gte("date", monthStart).lt("date", nextMonth),
        )
        .collect(),
    ]);

    const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));

    return await Promise.all(
      accounts.map(async (account) => {
        const item = await ctx.db.get(account.itemId);
        const mtdTransactions = account.isBalanceOnly
          ? []
          : monthTxns
              .filter((t) => t.accountId === account._id)
              .map((t) => ({
                id: t._id,
                date: t.date,
                description: t.description,
                amount: t.amount,
                pending: t.pending,
                isTransfer: t.isTransfer,
                categoryName: t.isTransfer
                  ? undefined
                  : t.categoryId
                    ? categoryNameById.get(t.categoryId)
                    : "Uncategorized",
              }))
              .sort((a, b) => b.date.localeCompare(a.date));

        return {
          ...account,
          institutionName: item?.institutionName ?? "Unknown",
          itemStatus: item?.status ?? ("active" as const),
          itemErrorMessage: item?.errorMessage,
          lastSyncedAt: item?.lastSyncedAt,
          mtdTransactions,
        };
      }),
    );
  },
});

export const totalBalance = authedQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    // Net worth style: assets add, liabilities (credit + loan) subtract.
    return accounts.reduce((total, a) => {
      if (a.type === "credit" || a.type === "loan") {
        return total - a.currentBalance;
      }
      return total + a.currentBalance;
    }, 0);
  },
});
