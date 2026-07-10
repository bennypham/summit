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
 */
export const summary = authedQuery({
  args: {},
  handler: async (ctx) => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthStart = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    const [budgets, categories, transactions] = await Promise.all([
      ctx.db.query("budgets").collect(),
      ctx.db.query("categories").collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          q.gte("date", monthStart).lt("date", nextMonth),
        )
        .collect(),
    ]);

    const nameById = new Map(categories.map((c) => [c._id, c.name]));
    const spendByCategory = new Map<string, number>();

    for (const t of transactions) {
      if (t.isTransfer || t.pending || t.amount <= 0) continue;
      const key = t.categoryId ?? "uncategorized";
      spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + t.amount);
    }

    const rows = budgets.map((b) => {
      const mtdSpend = spendByCategory.get(b.categoryId) ?? 0;
      return {
        categoryId: b.categoryId,
        categoryName: nameById.get(b.categoryId) ?? "Unknown",
        monthlyLimit: b.monthlyLimit,
        mtdSpend,
        remaining: b.monthlyLimit - mtdSpend,
        percentUsed:
          b.monthlyLimit > 0 ? (mtdSpend / b.monthlyLimit) * 100 : 0,
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
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { monthlyLimit });
      return existing._id;
    }
    return await ctx.db.insert("budgets", { categoryId, monthlyLimit });
  },
});
