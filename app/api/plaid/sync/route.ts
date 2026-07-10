// Manual "Refresh now" — same syncAll the daily cron runs.
// Useful after connecting a bank or when you don't want to wait for the cron.

import { api } from "@/convex/_generated/api";
import { authSecret } from "@/lib/auth";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

export async function POST() {
  if (!(await getAuthedSessionToken())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  await convexServerClient().action(api.plaidActions.syncAllForOwner, {
    serviceKey: authSecret(),
  });
  return Response.json({ ok: true });
}
