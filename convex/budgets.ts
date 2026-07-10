import { v } from "convex/values";
import { authedMutation, authedQuery } from "./functions";
import { ensureDefaultCategories } from "./lib/categories";

/** Idempotent: seed categories + default budgets if missing (e.g. after Refresh). */
export const ensureDefaults = authedMutation({
  args: {},
  handler: async (ctx) => {
    await ensureDefaultCategories(ctx);
  },
});

/**
 * Budget vs month-to-date spend per Category.
 * Spend rules: current calendar month, exclude Transfers, pending, and income (amount ≤ 0).
 * Each row includes the Transactions that make up mtdSpend so the UI can expand them.
 */
export const summary = authedQuery({
  args: {},
  handler: async (ctx) => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthStart = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    const [budgets, categories, transactions, accounts] = await Promise.all([
      ctx.db.query("budgets").collect(),
      ctx.db.query("categories").collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          q.gte("date", monthStart).lt("date", nextMonth),
        )
        .collect(),
      ctx.db.query("accounts").collect(),
    ]);

    const nameById = new Map(categories.map((c) => [c._id, c.name]));
    const accountNameById = new Map(accounts.map((a) => [a._id, a.name]));

    type SpendTxn = {
      id: string;
      date: string;
      description: string;
      amount: number;
      accountName: string;
    };
    const spendByCategory = new Map<
      string,
      { total: number; transactions: SpendTxn[] }
    >();

    for (const t of transactions) {
      if (t.isTransfer || t.pending || t.amount <= 0) continue;
      const key = t.categoryId ?? "uncategorized";
      const entry = spendByCategory.get(key) ?? { total: 0, transactions: [] };
      entry.total += t.amount;
      entry.transactions.push({
        id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        accountName: accountNameById.get(t.accountId) ?? "Unknown account",
      });
      spendByCategory.set(key, entry);
    }

    const rows = budgets.map((b) => {
      const spend = spendByCategory.get(b.categoryId);
      const mtdSpend = spend?.total ?? 0;
      const txns = (spend?.transactions ?? []).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      return {
        categoryId: b.categoryId,
        categoryName: nameById.get(b.categoryId) ?? "Unknown",
        monthlyLimit: b.monthlyLimit,
        mtdSpend,
        remaining: b.monthlyLimit - mtdSpend,
        percentUsed:
          b.monthlyLimit > 0 ? (mtdSpend / b.monthlyLimit) * 100 : 0,
        transactions: txns,
      };
    });

    rows.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    return { month, categories: rows };
  },
});

/** Upsert a monthly Budget for a Category. */
export const setBudget = authedMutation({
  args: {
    categoryId: v.id("categories"),
    monthlyLimit: v.number(),
  },
  handler: async (ctx, { categoryId, monthlyLimit }) => {
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
      throw new Error("monthlyLimit must be a non-negative number");
    }
    const category = await ctx.db.get(categoryId);
    if (!category) throw new Error("Category not found");

    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { monthlyLimit });
      return existing._id;
    }
    return await ctx.db.insert("budgets", { categoryId, monthlyLimit });
  },
});
