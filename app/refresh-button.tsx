"use client";

// Triggers the same syncAll the daily cron uses, then reloads the dashboard.
// Also retries Items stuck in "error" status from a previous failed sync.

import { useState } from "react";

export function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Sync failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={refresh}
        disabled={busy}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {busy ? "Syncing…" : "Refresh now"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
