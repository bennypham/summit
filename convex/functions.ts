import { v } from "convex/values";
import {
  customQuery,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { mutation, query } from "./_generated/server";
import { requireSession } from "./lib/session";

// Every domain function must be built from these wrappers so the session
// check physically cannot be forgotten (ADR-0002). The sessionToken arg is
// consumed here and never reaches handlers.
export const authedQuery = customQuery(query, {
  args: { sessionToken: v.string() },
  input: async (ctx, { sessionToken }) => {
    await requireSession(ctx, sessionToken);
    return { ctx: {}, args: {} };
  },
});

export const authedMutation = customMutation(mutation, {
  args: { sessionToken: v.string() },
  input: async (ctx, { sessionToken }) => {
    await requireSession(ctx, sessionToken);
    return { ctx: {}, args: {} };
  },
});
