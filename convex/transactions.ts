import { v } from "convex/values";
import { authedMutation, authedQuery } from "./functions";

function currentMonthRange() {
  const month = new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { month, monthStart, nextMonth };
}

/** Month-to-date Transactions for the activity list and search. */
export const listActivity = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { month, monthStart, nextMonth } = currentMonthRange();
    const [transactions, accounts, categories, items] = await Promise.all([
      ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          q.gte("date", monthStart).lt("date", nextMonth),
        )
        .collect(),
      ctx.db.query("accounts").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("items").collect(),
    ]);

    const accountById = new Map(accounts.map((a) => [a._id, a]));
    const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));
    const institutionByItemId = new Map(
      items.map((i) => [i._id, i.institutionName]),
    );

    const rows = transactions
      .map((t) => {
        const account = accountById.get(t.accountId);
        if (!account || account.isBalanceOnly) return null;
        return {
          id: t._id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          pending: t.pending,
          isTransfer: t.isTransfer,
          categoryId: t.categoryId,
          categoryName: t.isTransfer
            ? undefined
            : t.categoryId
              ? categoryNameById.get(t.categoryId)
              : "Uncategorized",
          accountName: account.name,
          institutionName:
            institutionByItemId.get(account.itemId) ?? "Unknown",
          accountMask: account.mask,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t != null)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { month, transactions: rows };
  },
});

/** Update a Transaction's display name and Category (manual overrides survive sync). */
export const update = authedMutation({
  args: {
    transactionId: v.id("transactions"),
    description: v.string(),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, { transactionId, description, categoryId }) => {
    const txn = await ctx.db.get(transactionId);
    if (!txn) throw new Error("Transaction not found");

    const trimmed = description.trim();
    if (!trimmed) throw new Error("Name is required");

    if (categoryId) {
      const category = await ctx.db.get(categoryId);
      if (!category) throw new Error("Category not found");
    }

    await ctx.db.patch(transactionId, {
      description: trimmed,
      ...(txn.isTransfer ? {} : { categoryId, categoryOverridden: true }),
      descriptionOverridden: true,
    });
  },
});
