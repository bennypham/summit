import { verifyAuthenticationResponse } from "@simplewebauthn/server";
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
  const convex = convexServerClient();
  const passkeys = await convex.query(api.auth.getPasskeys, {
    serviceKey: authSecret(),
  });
  const passkey = passkeys.find((p) => p.credentialId === body.id);
  if (!passkey) {
    return Response.json({ error: "Unknown credential" }, { status: 401 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: webauthnOrigin(),
    expectedRPID: rpID(),
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
      counter: passkey.counter,
      transports: passkey.transports as
        | ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]
        | undefined,
    },
  });
  if (!verification.verified) {
    return Response.json({ error: "Verification failed" }, { status: 401 });
  }

  await convex.mutation(api.auth.updatePasskeyCounter, {
    serviceKey: authSecret(),
    credentialId: passkey.credentialId,
    counter: verification.authenticationInfo.newCounter,
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
