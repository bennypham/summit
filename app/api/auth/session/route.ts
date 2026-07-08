import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { SESSION_COOKIE, isTokenPlausible } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

// Hands the session token (from the httpOnly cookie) to the browser so the
// Convex client can pass it to authedQuery/authedMutation. Convex re-validates
// the token on every call, so exposing it grants nothing a valid cookie
// doesn't already grant.
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !isTokenPlausible(token)) {
    return Response.json({ sessionToken: null }, { status: 401 });
  }
  const valid = await convexServerClient().query(api.auth.validateSession, {
    token,
  });
  if (!valid) {
    return Response.json({ sessionToken: null }, { status: 401 });
  }
  return Response.json({ sessionToken: token });
}
