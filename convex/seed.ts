import { internalMutation } from "./_generated/server";
import { ensureDefaultCategories } from "./lib/categories";

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

// Clears Plaid-linked data + categories/budgets so re-seed stays clean.
// Run with: npx convex run seed:clearFinanceData
export const clearFinanceData = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const t of await ctx.db.query("transactions").collect()) {
      await ctx.db.delete(t._id);
    }
    for (const b of await ctx.db.query("balanceSnapshots").collect()) {
      await ctx.db.delete(b._id);
    }
    for (const a of await ctx.db.query("accounts").collect()) {
      await ctx.db.delete(a._id);
    }
    for (const i of await ctx.db.query("items").collect()) {
      await ctx.db.delete(i._id);
    }
    for (const b of await ctx.db.query("budgets").collect()) {
      await ctx.db.delete(b._id);
    }
    for (const m of await ctx.db.query("plaidCategoryMappings").collect()) {
      await ctx.db.delete(m._id);
    }
    for (const c of await ctx.db.query("categories").collect()) {
      await ctx.db.delete(c._id);
    }
    return "Finance data cleared";
  },
});

// Fake data to prove the plumbing before Plaid exists.
// Run with: npx convex run seed:run
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("items").first();
    if (existing) throw new Error("Already seeded — clear tables first");

    await ensureDefaultCategories(ctx);

    const itemId = await ctx.db.insert("items", {
      plaidItemId: "seed-item-1",
      institutionName: "Sandbox Bank",
      accessToken: "seed-access-token",
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

    const groceries = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Groceries"))
      .first();
    const dining = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Dining"))
      .first();
    const rent = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Rent"))
      .first();
    const transportation = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Transportation"))
      .first();
    if (!groceries || !dining || !rent || !transportation) {
      throw new Error("Default categories missing after ensureDefaultCategories");
    }

    const month = new Date().toISOString().slice(0, 8); // "YYYY-MM-"
    const txns = [
      { accountId: checking, date: `${month}01`, description: "Apartment Rent", amount: 1850, categoryId: rent._id },
      { accountId: checking, date: `${month}03`, description: "Trader Joe's", amount: 84.12, categoryId: groceries._id },
      { accountId: credit, date: `${month}04`, description: "Chipotle", amount: 13.45, categoryId: dining._id },
      { accountId: credit, date: `${month}05`, description: "Whole Foods", amount: 56.9, categoryId: groceries._id },
      { accountId: credit, date: `${month}07`, description: "Lyft", amount: 22.5, categoryId: transportation._id },
      { accountId: checking, date: `${month}08`, description: "Shell Gas", amount: 48.75, categoryId: transportation._id },
      { accountId: credit, date: `${month}09`, description: "Safeway", amount: 67.34, categoryId: groceries._id },
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
        descriptionOverridden: false,
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
      descriptionOverridden: false,
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
      descriptionOverridden: false,
      isTransfer: true,
    });

    return "Seeded";
  },
});

/** Add MTD grocery + transportation activity on an existing Plaid Sandbox link. */
export const enrichBudgetActivity = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureDefaultCategories(ctx);

    const groceries = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Groceries"))
      .first();
    const transportation = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Transportation"))
      .first();
    if (!groceries || !transportation) {
      throw new Error("Groceries or Transportation category missing");
    }

    const accounts = await ctx.db.query("accounts").collect();
    const checking =
      accounts.find((a) => a.type === "checking" && !a.isBalanceOnly) ??
      accounts.find((a) => !a.isBalanceOnly);
    const credit = accounts.find((a) => a.type === "credit");
    if (!checking) throw new Error("No transaction account found");

    const month = new Date().toISOString().slice(0, 8);
    const demoTxns: {
      id: string;
      accountId: typeof checking._id;
      date: string;
      description: string;
      amount: number;
      categoryId: typeof groceries._id;
    }[] = [
      {
        id: "demo-grocery-whole-foods",
        accountId: checking._id,
        date: `${month}02`,
        description: "Whole Foods Market",
        amount: 82.16,
        categoryId: groceries._id,
      },
      {
        id: "demo-grocery-trader-joes",
        accountId: checking._id,
        date: `${month}05`,
        description: "Trader Joe's",
        amount: 54.38,
        categoryId: groceries._id,
      },
      {
        id: "demo-grocery-costco",
        accountId: credit?._id ?? checking._id,
        date: `${month}09`,
        description: "Costco",
        amount: 126.44,
        categoryId: groceries._id,
      },
      {
        id: "demo-transport-lyft",
        accountId: credit?._id ?? checking._id,
        date: `${month}04`,
        description: "Lyft",
        amount: 18.75,
        categoryId: transportation._id,
      },
      {
        id: "demo-transport-shell",
        accountId: checking._id,
        date: `${month}06`,
        description: "Shell Gas",
        amount: 52.4,
        categoryId: transportation._id,
      },
      {
        id: "demo-transport-bart",
        accountId: checking._id,
        date: `${month}11`,
        description: "BART Clipper",
        amount: 12.5,
        categoryId: transportation._id,
      },
    ];

    let inserted = 0;
    for (const t of demoTxns) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_transaction_id", (q) =>
          q.eq("plaidTransactionId", t.id),
        )
        .first();
      if (existing) continue;

      await ctx.db.insert("transactions", {
        accountId: t.accountId,
        plaidTransactionId: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        pending: false,
        categoryId: t.categoryId,
        categoryOverridden: true,
        descriptionOverridden: false,
        isTransfer: false,
      });
      inserted++;
    }

    return { inserted, skipped: demoTxns.length - inserted };
  },
});

/**
 * Sandbox loans/mortgages inflate liabilities — zero them for a readable demo net worth.
 * Re-run after Plaid Refresh if balances revert.
 */
export const normalizeNetWorthForDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    let patched = 0;

    for (const account of accounts) {
      if (account.type === "loan") {
        await ctx.db.patch(account._id, { currentBalance: 0, availableBalance: 0 });
        patched++;
        continue;
      }
      if (account.type === "credit" && account.currentBalance > 2500) {
        await ctx.db.patch(account._id, { currentBalance: 1200 });
        patched++;
      }
    }

    const updated = await ctx.db.query("accounts").collect();
    const total = updated.reduce((sum, a) => {
      if (a.type === "credit" || a.type === "loan") return sum - a.currentBalance;
      return sum + a.currentBalance;
    }, 0);

    return { patched, estimatedNetWorth: total };
  },
});
