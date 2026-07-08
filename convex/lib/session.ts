import { QueryCtx } from "../_generated/server";

export async function requireSession(ctx: QueryCtx, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Not signed in");
  }
  return session;
}

// Guards auth functions that only the Next.js server may call. Convex public
// functions are reachable by anyone with the deployment URL, so writes to
// passkeys/sessions require this shared secret (ADR-0002).
export function requireServiceKey(provided: string) {
  const expected = process.env.AUTH_SECRET;
  if (!expected) throw new Error("AUTH_SECRET not configured on deployment");
  if (provided !== expected) throw new Error("Invalid service key");
}
