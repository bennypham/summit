import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { SESSION_COOKIE, isTokenPlausible } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

export async function getAuthedSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !isTokenPlausible(token)) return null;
  const valid = await convexServerClient().query(api.auth.validateSession, {
    token,
  });
  return valid ? token : null;
}
