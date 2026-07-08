import { generateRegistrationOptions } from "@simplewebauthn/server";
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
  const existing = await convex.query(api.auth.getPasskeys, {
    serviceKey: authSecret(),
  });
  if (existing.length > 0) {
    return Response.json({ error: "Already registered" }, { status: 403 });
  }

  const options = await generateRegistrationOptions({
    rpName: "Summit",
    rpID: rpID(),
    userName: "owner",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    CHALLENGE_COOKIE,
    signChallenge(options.challenge),
    challengeCookieOptions(),
  );
  return Response.json(options);
}
