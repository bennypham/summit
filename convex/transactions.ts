import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./functions";

const activityFilter = v.union(
  v.literal("all"),
  v.literal("income"),
  v.literal("spending"),
  v.literal("transfers"),
);

export type ActivityFilter = "all" | "income" | "spending" | "transfers";

export type ActivityRow = {
  id: Id<"transactions">;
  date: string;
  description: string;
  amount: number;
  pending: boolean;
  isTransfer: boolean;
  categoryId?: Id<"categories">;
  categoryName?: string;
  accountName: string;
  institutionName: string;
  accountMask?: string;
};

type ActivityCursor = { date: string; id: string };

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

function currentMonthRange() {
  const month = new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { month, monthStart, nextMonth };
}

function encodeCursor(cursor: ActivityCursor): string {
  return `${cursor.date}_${cursor.id}`;
}

function decodeCursor(raw: string | null | undefined): ActivityCursor | null {
  if (!raw || raw.length < 12 || raw[10] !== "_") return null;
  const date = raw.slice(0, 10);
  const id = raw.slice(11);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !id) return null;
  return { date, id };
}

function matchesFilter(row: ActivityRow, filter: ActivityFilter) {
  if (filter === "income") return row.amount < 0 && !row.isTransfer;
  if (filter === "spending") return row.amount > 0 && !row.isTransfer;
  if (filter === "transfers") return row.isTransfer;
  return true;
}

function dateRangeOf(rows: ActivityRow[]) {
  if (rows.length === 0) return null;
  return { newest: rows[0]!.date, oldest: rows[rows.length - 1]!.date };
}

function compareActivity(a: ActivityRow, b: ActivityRow) {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  return b.id.localeCompare(a.id);
}

async function loadActivityRows(ctx: QueryCtx): Promise<ActivityRow[]> {
  const [transactions, accounts, categories, items] = await Promise.all([
    ctx.db.query("transactions").withIndex("by_date").order("desc").collect(),
    ctx.db.query("accounts").collect(),
    ctx.db.query("categories").collect(),
    ctx.db.query("items").collect(),
  ]);

  const accountById = new Map(accounts.map((a) => [a._id, a]));
  const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));
  const institutionByItemId = new Map(
    items.map((i) => [i._id, i.institutionName]),
  );

  const rows: ActivityRow[] = [];
  for (const t of transactions) {
    const account = accountById.get(t.accountId);
    if (!account || account.isBalanceOnly) continue;
    rows.push({
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
      institutionName: institutionByItemId.get(account.itemId) ?? "Unknown",
      accountMask: account.mask,
    });
  }

  return rows.sort(compareActivity);
}

function startIndexAfterCursor(rows: ActivityRow[], cursor: ActivityCursor | null) {
  if (!cursor) return 0;
  const exact = rows.findIndex((r) => r.date === cursor.date && r.id === cursor.id);
  if (exact >= 0) return exact + 1;
  return rows.findIndex(
    (r) =>
      r.date < cursor.date ||
      (r.date === cursor.date && r.id < cursor.id),
  );
}

/** Paginated Activity feed across all history (newest → oldest). */
export const listActivityPage = authedQuery({
  args: {
    filter: activityFilter,
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(
      Math.max(args.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const filter = args.filter;
    const cursor = decodeCursor(args.cursor ?? null);

    const filtered = (await loadActivityRows(ctx)).filter((row) =>
      matchesFilter(row, filter),
    );

    let start = startIndexAfterCursor(filtered, cursor);
    if (start < 0) start = filtered.length;

    const page = filtered.slice(start, start + limit);
    const remainingAfter = Math.max(0, filtered.length - start - page.length);
    const nextPageSize = Math.min(limit, remainingAfter);
    const nextPage = filtered.slice(
      start + page.length,
      start + page.length + nextPageSize,
    );
    const isDone = remainingAfter === 0;
    const last = page[page.length - 1];

    return {
      transactions: page,
      totalCount: filtered.length,
      continueCursor:
        !isDone && last
          ? encodeCursor({ date: last.date, id: last.id })
          : null,
      isDone,
      pageSize: limit,
      nextPageSize,
      pageRange: dateRangeOf(page),
      nextPageRange: dateRangeOf(nextPage),
    };
  },
});

/** Month-to-date In/Out for the right rail (independent of feed pages). */
export const mtdCashflow = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { month, monthStart, nextMonth } = currentMonthRange();
    const [transactions, accounts] = await Promise.all([
      ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          q.gte("date", monthStart).lt("date", nextMonth),
        )
        .collect(),
      ctx.db.query("accounts").collect(),
    ]);

    const balanceOnly = new Set(
      accounts.filter((a) => a.isBalanceOnly).map((a) => a._id),
    );

    let mtdIn = 0;
    let mtdOut = 0;
    for (const t of transactions) {
      if (balanceOnly.has(t.accountId) || t.pending) continue;
      if (t.amount < 0) mtdIn += -t.amount;
      else if (!t.isTransfer) mtdOut += t.amount;
    }

    return { month, mtdIn, mtdOut };
  },
});

/** @deprecated Prefer listActivityPage — kept for any stray callers. */
export const listActivity = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { month, monthStart, nextMonth } = currentMonthRange();
    const rows = (await loadActivityRows(ctx)).filter(
      (t) => t.date >= monthStart && t.date < nextMonth,
    );
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

    const patch: {
      description: string;
      descriptionOverridden: true;
      categoryId?: typeof categoryId;
      categoryOverridden?: true;
    } = {
      description: trimmed,
      descriptionOverridden: true,
    };

    if (!txn.isTransfer && categoryId !== undefined) {
      const prev = txn.categoryId ?? null;
      const next = categoryId ?? null;
      if (prev !== next) {
        patch.categoryId = categoryId;
        patch.categoryOverridden = true;
      }
    }

    await ctx.db.patch(transactionId, patch);
  },
});
