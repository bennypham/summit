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
