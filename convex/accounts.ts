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
    // Credit and loan balances are money owed, so they subtract from net.
    return accounts.reduce((total, a) => {
      if (a.type === "credit" || a.type === "loan") {
        return total - a.currentBalance;
      }
      return total + a.currentBalance;
    }, 0);
  },
});
