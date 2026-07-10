// GET a short-lived Plaid Link token so the browser can open the Link UI.
//
// Flow: browser → this route (session cookie) → Convex action (serviceKey) → Plaid.
// Plaid secrets never leave Convex; the browser only sees the link_token.

import { api } from "@/convex/_generated/api";
import { authSecret } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

export async function POST() {
  if (!(await getAuthedSessionToken())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const linkToken = await convexServerClient().action(
    api.plaidActions.createLinkToken,
    { serviceKey: authSecret() },
  );
  return Response.json({ linkToken });
}
