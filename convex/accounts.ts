import { authedQuery } from "./functions";

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    return await Promise.all(
      accounts.map(async (account) => {
        const item = await ctx.db.get(account.itemId);
        return {
          ...account,
          institutionName: item?.institutionName ?? "Unknown",
        };
      }),
    );
  },
});

export const totalBalance = authedQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    // Credit balances are money owed, so they subtract from net balance.
    return accounts.reduce(
      (total, a) =>
        a.type === "credit" ? total - a.currentBalance : total + a.currentBalance,
      0,
    );
  },
});
