"use client";

import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { useQuery } from "convex/react";
import { useState, useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";

const emptySubscribe = () => () => {};

export default function LoginPage() {
  const hasPasskeyQuery = useQuery(api.auth.hasPasskey);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The Convex query can resolve before hydration; rendering from it on the
  // first client render would mismatch the server HTML.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const hasPasskey = hydrated ? hasPasskeyQuery : undefined;

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/register/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error((await optionsRes.json()).error);
      const optionsJSON = await optionsRes.json();
      const attestation = await startRegistration({ optionsJSON });
      const verifyRes = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error);
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      setBusy(false);
    }
  }

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/login/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error((await optionsRes.json()).error);
      const optionsJSON = await optionsRes.json();
      const assertion = await startAuthentication({ optionsJSON });
      const verifyRes = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error);
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Summit
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {hasPasskey === undefined
          ? "Loading…"
          : hasPasskey
            ? "Sign in with your passkey."
            : "First run — register the owner passkey for this device."}
      </p>
      {hasPasskey !== undefined && (
        <button
          onClick={hasPasskey ? signIn : register}
          disabled={busy}
          className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-300"
        >
          {busy ? "Waiting…" : hasPasskey ? "Sign in" : "Set up passkey"}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
