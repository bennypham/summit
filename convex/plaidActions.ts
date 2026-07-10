// Plaid actions — the "orchestration" layer that talks to Plaid over the network.
//
// "use node" is required because the Plaid SDK needs Node APIs. Actions can call
// external HTTP APIs; mutations cannot. So the flow is:
//   action (fetch from Plaid) → internalMutation (write to Convex DB)
//
// Public actions require serviceKey so only our Next.js server can invoke them
// (browser clients never get AUTH_SECRET).

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

/** Walk every page of /transactions/sync until Plaid says hasMore=false. */
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
    // Persist each page immediately so a mid-sync crash doesn't lose progress —
    // the cursor is saved inside applySyncPage.
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

  // Success clears any previous error status.
  await ctx.runMutation(internal.plaidInternal.finishSync, {
    itemId,
    status: "active",
  });
}

/** Called by /api/plaid/link-token before opening Plaid Link in the browser. */
export const createLinkToken = action({
  args: { serviceKey: v.string() },
  handler: async (_ctx, { serviceKey }) => {
    requireServiceKey(serviceKey);
    // Single-user app — "owner" is a stable client_user_id for Plaid.
    return createIngestionAdapter().createLinkToken("owner");
  },
});

/**
 * Called after the user finishes Plaid Link.
 * 1) Exchange public_token → access_token
 * 2) Insert Item + Accounts
 * 3) Run the first full transaction sync
 */
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
      // undefined cursor = first sync (pull full history window).
      await syncItemById(ctx, itemId, result.accessToken, undefined);
    } catch (error) {
      // Keep the Item so Refresh/cron can retry; don't leave it half-connected.
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

/** Sync one Item. Used by syncAll (cron + Refresh now). */
export const syncItem = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.runQuery(internal.plaidInternal.getItem, { itemId });
    if (!item?.accessToken) return;
    // Retry both active and errored Items so a transient failure isn't permanent.
    if (item.status !== "active" && item.status !== "error") return;

    try {
      // Resume from the stored cursor for incremental updates.
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

/** Sync every connected bank. Daily cron and manual Refresh both land here. */
export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(internal.plaidInternal.listSyncableItems, {});
    // Isolate failures so one bad Item doesn't skip the rest of the cron run.
    for (const item of items) {
      try {
        await ctx.runAction(internal.plaidActions.syncItem, { itemId: item._id });
      } catch (error) {
        console.error(`Sync failed for item ${item._id}:`, error);
      }
    }
  },
});

/** Public entry for /api/plaid/sync — same work as the cron, gated by serviceKey. */
export const syncAllForOwner = action({
  args: { serviceKey: v.string() },
  handler: async (ctx, { serviceKey }) => {
    requireServiceKey(serviceKey);
    await ctx.runAction(internal.plaidActions.syncAll, {});
    return { ok: true };
  },
});
