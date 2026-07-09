import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import {
  CHALLENGE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  authSecret,
  newSessionToken,
  rpID,
  sessionCookieOptions,
  verifyChallenge,
  webauthnOrigin,
} from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const signedChallenge = cookieStore.get(CHALLENGE_COOKIE)?.value;
  const expectedChallenge = signedChallenge ? verifyChallenge(signedChallenge) : null;
  cookieStore.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) {
    return Response.json({ error: "Missing or invalid challenge" }, { status: 400 });
  }

  const body = await request.json();
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: webauthnOrigin(),
    expectedRPID: rpID(),
  });
  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: "Verification failed" }, { status: 401 });
  }

  const { credential } = verification.registrationInfo;
  const convex = convexServerClient();
  await convex.mutation(api.auth.storePasskey, {
    serviceKey: authSecret(),
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports,
  });

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = newSessionToken(expiresAt);
  await convex.mutation(api.auth.createSession, {
    serviceKey: authSecret(),
    token,
    expiresAt,
  });
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
  return Response.json({ ok: true });
}
