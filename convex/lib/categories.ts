// Our Category list vs Plaid's taxonomy.
//
// Budgets need a small, stable list we control (Groceries, Dining, …).
// Plaid sends machine categories like FOOD_AND_DRINK — we map those to ours
// as defaults. Manual overrides on a Transaction always win (see upsertTransaction).

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const DEFAULT_CATEGORIES = [
  "Uncategorized",
  "Groceries",
  "Dining",
  "Rent",
  "Transportation",
  "Subscriptions",
  "Shopping",
  "Entertainment",
] as const;

/** Starter monthly limits so Sandbox spend has something to compare against. */
const DEFAULT_BUDGETS: Record<string, number> = {
  Groceries: 500,
  Dining: 200,
  Rent: 2000,
  Transportation: 300,
  Subscriptions: 100,
  Shopping: 250,
  Entertainment: 150,
};

/** Plaid personal_finance_category.primary → our Category name. */
const PLAID_DEFAULT_MAPPINGS: Record<string, string> = {
  FOOD_AND_DRINK: "Dining",
  RENT_AND_UTILITIES: "Rent",
  TRANSPORTATION: "Transportation",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Entertainment",
  GROCERIES: "Groceries",
  GENERAL_SERVICES: "Subscriptions",
};

/** First match by name — seed used to insert duplicates, so avoid .unique(). */
async function categoryByName(ctx: QueryCtx | MutationCtx, name: string) {
  return await ctx.db
    .query("categories")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();
}

/**
 * Collapse duplicate Category names (from repeated seed runs) onto one row.
 * Re-points Transactions / Budgets / mappings, then deletes the extras.
 */
export async function dedupeCategories(ctx: MutationCtx) {
  const all = await ctx.db.query("categories").collect();
  const byName = new Map<string, typeof all>();
  for (const c of all) {
    const list = byName.get(c.name) ?? [];
    list.push(c);
    byName.set(c.name, list);
  }

  for (const [, group] of byName) {
    if (group.length < 2) continue;
    const [keep, ...dupes] = group;
    const dupeIds = new Set(dupes.map((d) => d._id));

    for (const t of await ctx.db.query("transactions").collect()) {
      if (t.categoryId && dupeIds.has(t.categoryId)) {
        await ctx.db.patch(t._id, { categoryId: keep._id });
      }
    }

    let keeperBudget = await ctx.db
      .query("budgets")
      .withIndex("by_category", (q) => q.eq("categoryId", keep._id))
      .first();
    for (const dupe of dupes) {
      const budget = await ctx.db
        .query("budgets")
        .withIndex("by_category", (q) => q.eq("categoryId", dupe._id))
        .first();
      if (!budget) continue;
      if (keeperBudget) await ctx.db.delete(budget._id);
      else {
        await ctx.db.patch(budget._id, { categoryId: keep._id });
        keeperBudget = await ctx.db
          .query("budgets")
          .withIndex("by_category", (q) => q.eq("categoryId", keep._id))
          .first();
      }
    }

    for (const m of await ctx.db.query("plaidCategoryMappings").collect()) {
      if (dupeIds.has(m.categoryId)) {
        await ctx.db.patch(m._id, { categoryId: keep._id });
      }
    }

    for (const dupe of dupes) await ctx.db.delete(dupe._id);
  }
}

/** Idempotent seed — safe to call on every new bank connection. */
export async function ensureDefaultCategories(ctx: MutationCtx) {
  await dedupeCategories(ctx);

  for (const name of DEFAULT_CATEGORIES) {
    const existing = await categoryByName(ctx, name);
    if (!existing) await ctx.db.insert("categories", { name });
  }

  for (const [plaidPrimary, categoryName] of Object.entries(
    PLAID_DEFAULT_MAPPINGS,
  )) {
    const mapping = await ctx.db
      .query("plaidCategoryMappings")
      .withIndex("by_plaid_primary", (q) => q.eq("plaidPrimary", plaidPrimary))
      .first();
    if (mapping) continue;

    const category = await categoryByName(ctx, categoryName);
    if (!category) continue;
    await ctx.db.insert("plaidCategoryMappings", {
      plaidPrimary,
      categoryId: category._id,
    });
  }

  for (const [name, monthlyLimit] of Object.entries(DEFAULT_BUDGETS)) {
    const category = await categoryByName(ctx, name);
    if (!category) continue;
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .first();
    if (!existing) {
      await ctx.db.insert("budgets", {
        categoryId: category._id,
        monthlyLimit,
      });
    }
  }
}

/** Look up our Category for a Plaid primary; fall back to Uncategorized. */
export async function resolveCategoryId(
  ctx: QueryCtx | MutationCtx,
  plaidCategoryPrimary: string | undefined,
): Promise<Id<"categories"> | undefined> {
  if (!plaidCategoryPrimary) return undefined;
  const mapping = await ctx.db
    .query("plaidCategoryMappings")
    .withIndex("by_plaid_primary", (q) =>
      q.eq("plaidPrimary", plaidCategoryPrimary),
    )
    .first();
  if (mapping) return mapping.categoryId;

  const uncategorized = await categoryByName(ctx, "Uncategorized");
  return uncategorized?._id;
}
