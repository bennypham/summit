import { authedQuery } from "./functions";

/** Institution Items with sync health — for dashboard status. */
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    return items
      .map((item) => ({
        _id: item._id,
        institutionName: item.institutionName,
        status: item.status,
        errorMessage: item.errorMessage,
        lastSyncedAt: item.lastSyncedAt,
      }))
      .sort((a, b) => a.institutionName.localeCompare(b.institutionName));
  },
});
