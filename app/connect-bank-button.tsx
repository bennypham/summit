"use client";

// Opens Plaid Link, then exchanges the public_token for a stored bank connection.

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

export function ConnectBankButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
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
      setLinkToken(null);
      setBusy(false);
    },
  });

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

  const btnClass =
    variant === "sidebar"
      ? "btn-primary w-full text-caption"
      : "btn-primary text-caption";

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={connect} disabled={busy} className={btnClass}>
        {busy ? "Connecting…" : "Connect institution"}
      </button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
