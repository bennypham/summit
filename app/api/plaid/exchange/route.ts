// Finish Plaid Link: exchange the public_token for an access_token and first sync.
//
// The browser gets a public_token from Plaid Link onSuccess — that token is
// useless without our secret, so it's safe to POST here. We hand it to Convex,
// which stores the durable access_token and pulls transactions.

import { api } from "@/convex/_generated/api";
import { authSecret } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

export async function POST(request: Request) {
  if (!(await getAuthedSessionToken())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { publicToken } = await request.json();
  if (!publicToken) {
    return Response.json({ error: "Missing publicToken" }, { status: 400 });
  }

  const result = await convexServerClient().action(
    api.plaidActions.exchangePublicToken,
    { serviceKey: authSecret(), publicToken },
  );
  return Response.json(result);
}
