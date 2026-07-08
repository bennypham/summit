import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireServiceKey } from "./lib/session";

// The login page uses this to decide between "set up passkey" and "sign in".
// It leaks only whether first-run setup has happened.
export const hasPasskey = query({
  args: {},
  handler: async (ctx) => {
    const passkey = await ctx.db.query("passkeys").first();
    return passkey !== null;
  },
});

// Used by the Next.js proxy to gate every page request.
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return session !== null && session.expiresAt > Date.now();
  },
});

export const getPasskeys = query({
  args: { serviceKey: v.string() },
  handler: async (ctx, { serviceKey }) => {
    requireServiceKey(serviceKey);
    return await ctx.db.query("passkeys").collect();
  },
});

export const storePasskey = mutation({
  args: {
    serviceKey: v.string(),
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    transports: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { serviceKey, ...passkey }) => {
    requireServiceKey(serviceKey);
    // Bootstrap guard: exactly one passkey, ever. After the owner registers,
    // this becomes permanently unreachable.
    const existing = await ctx.db.query("passkeys").first();
    if (existing) throw new Error("A passkey is already registered");
    await ctx.db.insert("passkeys", passkey);
  },
});

export const updatePasskeyCounter = mutation({
  args: {
    serviceKey: v.string(),
    credentialId: v.string(),
    counter: v.number(),
  },
  handler: async (ctx, { serviceKey, credentialId, counter }) => {
    requireServiceKey(serviceKey);
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_credential_id", (q) => q.eq("credentialId", credentialId))
      .unique();
    if (!passkey) throw new Error("Unknown credential");
    await ctx.db.patch(passkey._id, { counter });
  },
});

export const createSession = mutation({
  args: {
    serviceKey: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { serviceKey, token, expiresAt }) => {
    requireServiceKey(serviceKey);
    await ctx.db.insert("sessions", { token, expiresAt });
  },
});

export const deleteSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
