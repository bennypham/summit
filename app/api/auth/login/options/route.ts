import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import {
  CHALLENGE_COOKIE,
  authSecret,
  challengeCookieOptions,
  rpID,
  signChallenge,
} from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";

export async function POST() {
  const convex = convexServerClient();
  const passkeys = await convex.query(api.auth.getPasskeys, {
    serviceKey: authSecret(),
  });
  if (passkeys.length === 0) {
    return Response.json({ error: "No passkey registered" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports as
        | ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]
        | undefined,
    })),
  });

  const cookieStore = await cookies();
  cookieStore.set(
    CHALLENGE_COOKIE,
    signChallenge(options.challenge),
    challengeCookieOptions(),
  );
  return Response.json(options);
}
