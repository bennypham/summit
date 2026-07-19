import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  authSecret,
  newSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

/** Dev-only session for browsers that cannot complete WebAuthn (e.g. Cursor). */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = newSessionToken(expiresAt);
  const convex = convexServerClient();
  await convex.mutation(api.auth.createSession, {
    serviceKey: authSecret(),
    token,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
  return Response.json({ ok: true });
}
