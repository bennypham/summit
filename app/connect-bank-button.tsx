"use client";

// Opens Plaid Link, then exchanges the public_token for a stored bank connection.
//
// Sequence:
// 1. Click → POST /api/plaid/link-token → get linkToken
// 2. usePlaidLink opens the Plaid modal (Sandbox: First Platypus Bank)
// 3. onSuccess → POST /api/plaid/exchange with publicToken
// 4. Reload so the server-rendered dashboard shows the new accounts

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

export function ConnectBankButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSuccess = useCallback(async (publicToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Exchange failed");
      // Full reload: dashboard is a Server Component reading Convex on the server.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setBusy(false);
      setLinkToken(null);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token) => onSuccess(public_token),
    onExit: () => {
      // User closed Link without connecting — reset so they can try again.
      setLinkToken(null);
      setBusy(false);
    },
  });

  // Open Link as soon as we have a token and the Plaid script is ready.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to start Link");
      const { linkToken: token } = await res.json();
      setLinkToken(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={connect}
        disabled={busy}
        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-300"
      >
        {busy ? "Connecting…" : "Connect bank (Sandbox)"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
