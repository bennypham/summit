"use client";

import { useState } from "react";

export function RefreshButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
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

  const btnClass =
    variant === "sidebar"
      ? "btn-ghost w-full border-dark-border text-dark-muted hover:border-dark-muted hover:bg-dark-surface"
      : "btn-ghost text-caption disabled:opacity-50";

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={refresh} disabled={busy} className={btnClass}>
        {busy ? "Syncing…" : "Refresh now"}
      </button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
