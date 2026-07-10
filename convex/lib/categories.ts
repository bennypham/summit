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
  "Shopping",
  "Entertainment",
] as const;

/** Plaid personal_finance_category.primary → our Category name. */
const PLAID_DEFAULT_MAPPINGS: Record<string, string> = {
  FOOD_AND_DRINK: "Dining",
  RENT_AND_UTILITIES: "Rent",
  TRANSPORTATION: "Transportation",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Entertainment",
  GROCERIES: "Groceries",
};

/** Idempotent seed — safe to call on every new bank connection. */
export async function ensureDefaultCategories(ctx: MutationCtx) {
  for (const name of DEFAULT_CATEGORIES) {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (!existing) await ctx.db.insert("categories", { name });
  }

  for (const [plaidPrimary, categoryName] of Object.entries(
    PLAID_DEFAULT_MAPPINGS,
  )) {
    const mapping = await ctx.db
      .query("plaidCategoryMappings")
      .withIndex("by_plaid_primary", (q) => q.eq("plaidPrimary", plaidPrimary))
      .unique();
    if (mapping) continue;

    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", categoryName))
      .unique();
    if (!category) continue;
    await ctx.db.insert("plaidCategoryMappings", {
      plaidPrimary,
      categoryId: category._id,
    });
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
    .unique();
  if (mapping) return mapping.categoryId;

  const uncategorized = await ctx.db
    .query("categories")
    .withIndex("by_name", (q) => q.eq("name", "Uncategorized"))
    .unique();
  return uncategorized?._id;
}
