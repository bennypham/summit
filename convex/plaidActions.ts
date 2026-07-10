"use node";

import { v } from "convex/values";
import {
  action,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createIngestionAdapter } from "./ingestion/plaid";
import { requireServiceKey } from "./lib/session";

async function syncItemById(
  ctx: ActionCtx,
  itemId: Id<"items">,
  accessToken: string,
  syncCursor: string | undefined,
) {
  const adapter = createIngestionAdapter();
  let cursor = syncCursor;
  let hasMore = true;

  while (hasMore) {
    const page = await adapter.syncPage(accessToken, cursor);
    await ctx.runMutation(internal.plaidInternal.applySyncPage, {
      itemId,
      added: page.added,
      modified: page.modified,
      removedIds: page.removedIds,
      accounts: page.accounts,
      nextCursor: page.nextCursor,
    });
    cursor = page.nextCursor;
    hasMore = page.hasMore;
  }

  await ctx.runMutation(internal.plaidInternal.finishSync, {
    itemId,
    status: "active",
  });
}

export const createLinkToken = action({
  args: { serviceKey: v.string() },
  handler: async (_ctx, { serviceKey }) => {
    requireServiceKey(serviceKey);
    return createIngestionAdapter().createLinkToken("owner");
  },
});

export const exchangePublicToken = action({
  args: { serviceKey: v.string(), publicToken: v.string() },
  handler: async (ctx, { serviceKey, publicToken }) => {
    requireServiceKey(serviceKey);
    const result = await createIngestionAdapter().exchangePublicToken(publicToken);

    const itemId = await ctx.runMutation(internal.plaidInternal.completeExchange, {
      accessToken: result.accessToken,
      externalItemId: result.externalItemId,
      institutionName: result.institutionName,
      accounts: result.accounts,
    });

    try {
      await syncItemById(ctx, itemId, result.accessToken, undefined);
    } catch (error) {
      await ctx.runMutation(internal.plaidInternal.finishSync, {
        itemId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Sync failed",
      });
      throw error;
    }

    return { institutionName: result.institutionName };
  },
});

export const syncItem = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.runQuery(internal.plaidInternal.getItem, { itemId });
    if (!item || item.status !== "active" || !item.accessToken) return;

    try {
      await syncItemById(ctx, itemId, item.accessToken, item.syncCursor);
    } catch (error) {
      await ctx.runMutation(internal.plaidInternal.finishSync, {
        itemId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Sync failed",
      });
      throw error;
    }
  },
});

export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(internal.plaidInternal.listActiveItems, {});
    for (const item of items) {
      await ctx.runAction(internal.plaidActions.syncItem, { itemId: item._id });
    }
  },
});

// Called from Next.js manual refresh — gated by session on the API route.
export const syncAllForOwner = action({
  args: { serviceKey: v.string() },
  handler: async (ctx, { serviceKey }) => {
    requireServiceKey(serviceKey);
    await ctx.runAction(internal.plaidActions.syncAll, {});
    return { ok: true };
  },
});
