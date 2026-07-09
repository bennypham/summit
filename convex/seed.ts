import { internalMutation } from "./_generated/server";

// Dev utility: wipe auth state to redo first-run passkey setup.
// Run with: npx convex run seed:resetAuth
export const resetAuth = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const p of await ctx.db.query("passkeys").collect()) {
      await ctx.db.delete(p._id);
    }
    for (const s of await ctx.db.query("sessions").collect()) {
      await ctx.db.delete(s._id);
    }
    return "Auth reset";
  },
});

// Fake data to prove the plumbing before Plaid exists (PR 2 replaces this
// as the data source). Run with: npx convex run seed:run
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("items").first();
    if (existing) throw new Error("Already seeded — clear tables first");

    const itemId = await ctx.db.insert("items", {
      plaidItemId: "seed-item-1",
      institutionName: "Sandbox Bank",
      status: "active",
      lastSyncedAt: Date.now(),
    });

    const checking = await ctx.db.insert("accounts", {
      itemId,
      plaidAccountId: "seed-checking",
      name: "Everyday Checking",
      type: "checking",
      mask: "0001",
      currentBalance: 4250.33,
      availableBalance: 4250.33,
      isBalanceOnly: false,
    });
    const credit = await ctx.db.insert("accounts", {
      itemId,
      plaidAccountId: "seed-credit",
      name: "Rewards Card",
      type: "credit",
      mask: "4242",
      currentBalance: 613.72,
      isBalanceOnly: false,
    });
    await ctx.db.insert("accounts", {
      itemId,
      plaidAccountId: "seed-savings",
      name: "High-Yield Savings",
      type: "savings",
      mask: "0002",
      currentBalance: 12000,
      isBalanceOnly: false,
    });
    await ctx.db.insert("accounts", {
      itemId,
      plaidAccountId: "seed-brokerage",
      name: "Brokerage",
      type: "brokerage",
      mask: "7777",
      currentBalance: 31500.5,
      isBalanceOnly: true,
    });

    const groceries = await ctx.db.insert("categories", { name: "Groceries" });
    const dining = await ctx.db.insert("categories", { name: "Dining" });
    const rent = await ctx.db.insert("categories", { name: "Rent" });
    await ctx.db.insert("budgets", { categoryId: groceries, monthlyLimit: 500 });
    await ctx.db.insert("budgets", { categoryId: dining, monthlyLimit: 200 });

    const month = new Date().toISOString().slice(0, 8); // "YYYY-MM-"
    const txns = [
      { accountId: checking, date: `${month}01`, description: "Apartment Rent", amount: 1850, categoryId: rent },
      { accountId: checking, date: `${month}03`, description: "Trader Joe's", amount: 84.12, categoryId: groceries },
      { accountId: credit, date: `${month}04`, description: "Chipotle", amount: 13.45, categoryId: dining },
      { accountId: credit, date: `${month}05`, description: "Whole Foods", amount: 56.9, categoryId: groceries },
      { accountId: checking, date: `${month}06`, description: "Paycheck", amount: -3200, categoryId: undefined },
    ];
    for (const [i, t] of txns.entries()) {
      await ctx.db.insert("transactions", {
        accountId: t.accountId,
        plaidTransactionId: `seed-txn-${i}`,
        date: t.date,
        description: t.description,
        amount: t.amount,
        pending: false,
        categoryId: t.categoryId,
        categoryOverridden: false,
        isTransfer: false,
      });
    }
    // A credit card payment: the canonical Transfer pair (excluded from spend).
    await ctx.db.insert("transactions", {
      accountId: checking,
      plaidTransactionId: "seed-txn-transfer-out",
      date: `${month}06`,
      description: "Payment to Rewards Card",
      amount: 400,
      pending: false,
      categoryId: undefined,
      categoryOverridden: false,
      isTransfer: true,
    });
    await ctx.db.insert("transactions", {
      accountId: credit,
      plaidTransactionId: "seed-txn-transfer-in",
      date: `${month}06`,
      description: "Payment Received",
      amount: -400,
      pending: false,
      categoryId: undefined,
      categoryOverridden: false,
      isTransfer: true,
    });

    return "Seeded";
  },
});
