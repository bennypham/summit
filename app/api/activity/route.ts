import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";
import { getAuthedSessionToken } from "@/lib/session-server";

const FILTERS = new Set(["all", "income", "spending", "transfers"]);

export async function GET(request: Request) {
  const sessionToken = await getAuthedSessionToken();
  if (!sessionToken) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filterRaw = url.searchParams.get("filter") ?? "all";
  if (!FILTERS.has(filterRaw)) {
    return Response.json({ error: "Invalid filter" }, { status: 400 });
  }

  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limitRaw && (!Number.isFinite(limit) || (limit ?? 0) < 1)) {
    return Response.json({ error: "Invalid limit" }, { status: 400 });
  }

  const page = await convexServerClient().query(
    api.transactions.listActivityPage,
    {
      sessionToken,
      filter: filterRaw as "all" | "income" | "spending" | "transfers",
      cursor: cursor || null,
      limit,
    },
  );

  return Response.json(page);
}
