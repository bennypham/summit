import { NextResponse, type NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SESSION_COOKIE, isTokenPlausible } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/"];

// Next.js 16 renamed middleware.ts → proxy.ts (export function proxy).
// Layer 1: validate the httpOnly cookie against the Convex sessions table on
// every request, not just a local HMAC check — revoked sessions fail here.
async function sessionValid(token: string): Promise<boolean> {
  if (!isTokenPlausible(token)) return false;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return false;
  const convex = new ConvexHttpClient(url);
  return convex.query(api.auth.validateSession, { token });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await sessionValid(token))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
