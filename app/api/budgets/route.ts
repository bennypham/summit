import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

export async function POST(request: Request) {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as {
    categoryId?: string;
    monthlyLimit?: number;
  };
  if (!body.categoryId || typeof body.monthlyLimit !== "number") {
    return Response.json(
      { error: "categoryId and monthlyLimit are required" },
      { status: 400 },
    );
  }

  await convexServerClient().mutation(api.budgets.setBudget, {
    sessionToken,
    categoryId: body.categoryId as Id<"categories">,
    monthlyLimit: body.monthlyLimit,
  });

  return Response.json({ ok: true });
}
