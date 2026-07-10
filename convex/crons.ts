// Scheduled jobs that keep bank data fresh without you opening the app.
//
// Banks typically post once a day, so a daily sync is enough. Manual "Refresh
// now" uses the same syncAll action if you need fresher data sooner.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 14:00 UTC ≈ morning US time depending on DST.
crons.daily(
  "plaid sync",
  { hourUTC: 14, minuteUTC: 0 },
  internal.plaidActions.syncAll,
  {},
);

export default crons;
