import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "summit_session";
export const CHALLENGE_COOKIE = "summit_challenge";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export function rpID(): string {
  return process.env.WEBAUTHN_RP_ID ?? "localhost";
}

export function webauthnOrigin(): string {
  return process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
}

function hmac(value: string): string {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function sign(value: string): string {
  return `${value}.${hmac(value)}`;
}

function verify(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const sig = Buffer.from(signed.slice(dot + 1));
  const expected = Buffer.from(hmac(value));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  return value;
}

// Session tokens are signed and carry their own expiry so the proxy can
// reject strangers without a database round-trip. Convex independently checks
// the token against the sessions table, which is what makes logout stick.
export function newSessionToken(expiresAt: number): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: expiresAt, nonce: randomBytes(16).toString("base64url") }),
  ).toString("base64url");
  return sign(payload);
}

export function isTokenPlausible(token: string): boolean {
  const payload = verify(token);
  if (!payload) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// The WebAuthn challenge round-trips through a cookie; signing it stops the
// client from substituting a challenge of its own choosing.
export function signChallenge(challenge: string): string {
  return sign(challenge);
}

export function verifyChallenge(signed: string): string | null {
  return verify(signed);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function challengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  };
}
