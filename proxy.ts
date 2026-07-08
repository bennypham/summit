import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isTokenPlausible } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/"];

// First auth layer: gates every page and API route (ADR-0002). The signature
// and expiry check here needs no network hop; Convex independently validates
// the session against the database on every data access.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && isTokenPlausible(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
