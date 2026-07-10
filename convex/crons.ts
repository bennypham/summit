import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "plaid sync",
  { hourUTC: 14, minuteUTC: 0 },
  internal.plaidActions.syncAll,
  {},
);

export default crons;
