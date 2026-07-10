import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ensureDefaultCategories, resolveCategoryId } from "./lib/categories";
import type { NormalizedAccount, NormalizedTransaction } from "./ingestion/types";

const accountValidator = v.object({
  externalAccountId: v.string(),
  name: v.string(),
  type: v.union(
    v.literal("checking"),
    v.literal("savings"),
    v.literal("credit"),
    v.literal("loan"),
    v.literal("brokerage"),
  ),
  mask: v.optional(v.string()),
  currentBalance: v.number(),
  availableBalance: v.optional(v.number()),
  isBalanceOnly: v.boolean(),
});

const transactionValidator = v.object({
  externalTransactionId: v.string(),
  externalAccountId: v.string(),
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  pending: v.boolean(),
  isTransfer: v.boolean(),
  plaidCategoryPrimary: v.optional(v.string()),
});

export const listActiveItems = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    return items.filter((item) => item.status === "active");
  },
});

export const getItem = internalQuery({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    return await ctx.db.get(itemId);
  },
});

export const completeExchange = internalMutation({
  args: {
    accessToken: v.string(),
    externalItemId: v.string(),
    institutionName: v.string(),
    accounts: v.array(accountValidator),
  },
  handler: async (ctx, { accessToken, externalItemId, institutionName, accounts }) => {
    await ensureDefaultCategories(ctx);

    const existing = await ctx.db
      .query("items")
      .withIndex("by_plaid_item_id", (q) => q.eq("plaidItemId", externalItemId))
      .unique();
    if (existing) {
      throw new Error("This institution is already connected");
    }

    const itemId = await ctx.db.insert("items", {
      plaidItemId: externalItemId,
      institutionName,
      accessToken,
      status: "active",
      lastSyncedAt: Date.now(),
    });

    for (const account of accounts) {
      await ctx.db.insert("accounts", {
        itemId,
        plaidAccountId: account.externalAccountId,
        name: account.name,
        type: account.type,
        mask: account.mask,
        currentBalance: account.currentBalance,
        availableBalance: account.availableBalance,
        isBalanceOnly: account.isBalanceOnly,
      });
    }

    return itemId;
  },
});

async function upsertTransaction(
  ctx: MutationCtx,
  account: { _id: Id<"accounts">; isBalanceOnly: boolean },
  txn: NormalizedTransaction,
) {
  if (account.isBalanceOnly) return;

  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_plaid_transaction_id", (q) =>
      q.eq("plaidTransactionId", txn.externalTransactionId),
    )
    .unique();

  const categoryId = existing?.categoryOverridden
    ? existing.categoryId
    : await resolveCategoryId(ctx, txn.plaidCategoryPrimary);

  if (existing) {
    // Pending → posted: same plaidTransactionId, updated amount/date/pending flag.
    await ctx.db.patch(existing._id, {
      date: txn.date,
      description: txn.description,
      amount: txn.amount,
      pending: txn.pending,
      isTransfer: txn.isTransfer,
      ...(existing.categoryOverridden ? {} : { categoryId }),
    });
    return;
  }

  await ctx.db.insert("transactions", {
    accountId: account._id,
    plaidTransactionId: txn.externalTransactionId,
    date: txn.date,
    description: txn.description,
    amount: txn.amount,
    pending: txn.pending,
    categoryId,
    categoryOverridden: false,
    isTransfer: txn.isTransfer,
  });
}

async function upsertAccounts(
  ctx: MutationCtx,
  itemId: Id<"items">,
  accounts: NormalizedAccount[],
) {
  const today = new Date().toISOString().slice(0, 10);

  for (const incoming of accounts) {
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_plaid_account_id", (q) =>
        q.eq("plaidAccountId", incoming.externalAccountId),
      )
      .unique();

    let accountId = existing?._id;
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: incoming.name,
        type: incoming.type,
        currentBalance: incoming.currentBalance,
        availableBalance: incoming.availableBalance,
        isBalanceOnly: incoming.isBalanceOnly,
      });
    } else {
      accountId = await ctx.db.insert("accounts", {
        itemId,
        plaidAccountId: incoming.externalAccountId,
        name: incoming.name,
        type: incoming.type,
        mask: incoming.mask,
        currentBalance: incoming.currentBalance,
        availableBalance: incoming.availableBalance,
        isBalanceOnly: incoming.isBalanceOnly,
      });
    }

    if (!accountId) continue;
    const snapshot = await ctx.db
      .query("balanceSnapshots")
      .withIndex("by_account_and_date", (q) =>
        q.eq("accountId", accountId).eq("date", today),
      )
      .unique();
    if (snapshot) {
      await ctx.db.patch(snapshot._id, { balance: incoming.currentBalance });
    } else {
      await ctx.db.insert("balanceSnapshots", {
        accountId,
        date: today,
        balance: incoming.currentBalance,
      });
    }
  }
}

export const applySyncPage = internalMutation({
  args: {
    itemId: v.id("items"),
    added: v.array(transactionValidator),
    modified: v.array(transactionValidator),
    removedIds: v.array(v.string()),
    accounts: v.array(accountValidator),
    nextCursor: v.string(),
  },
  handler: async (ctx, { itemId, added, modified, removedIds, accounts, nextCursor }) => {
    await ensureDefaultCategories(ctx);
    await upsertAccounts(ctx, itemId, accounts);

    for (const txn of [...added, ...modified]) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_plaid_account_id", (q) =>
          q.eq("plaidAccountId", txn.externalAccountId),
        )
        .unique();
      if (!account) continue;
      await upsertTransaction(ctx, account, txn);
    }

    for (const plaidTransactionId of removedIds) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_transaction_id", (q) =>
          q.eq("plaidTransactionId", plaidTransactionId),
        )
        .unique();
      if (existing) await ctx.db.delete(existing._id);
    }

    await ctx.db.patch(itemId, { syncCursor: nextCursor });
  },
});

export const finishSync = internalMutation({
  args: {
    itemId: v.id("items"),
    status: v.union(v.literal("active"), v.literal("error")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, status, errorMessage }) => {
    await ctx.db.patch(itemId, {
      status,
      errorMessage,
      lastSyncedAt: Date.now(),
    });
  },
});
