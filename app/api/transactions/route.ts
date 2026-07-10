import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

export async function PATCH(request: Request) {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as {
    transactionId?: string;
    description?: string;
    categoryId?: string | null;
  };
  if (!body.transactionId || typeof body.description !== "string") {
    return Response.json(
      { error: "transactionId and description are required" },
      { status: 400 },
    );
  }

  await convexServerClient().mutation(api.transactions.update, {
    sessionToken,
    transactionId: body.transactionId as Id<"transactions">,
    description: body.description,
    categoryId:
      body.categoryId != null
        ? (body.categoryId as Id<"categories">)
        : undefined,
  });

  return Response.json({ ok: true });
}
