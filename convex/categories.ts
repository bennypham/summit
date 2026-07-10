import { authedQuery } from "./functions";

/** All Categories for filters and edit chips. */
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    return categories
      .map((c) => ({ _id: c._id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
