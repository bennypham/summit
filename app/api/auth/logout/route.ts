import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { SESSION_COOKIE } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await convexServerClient().mutation(api.auth.deleteSession, { token });
  }
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
