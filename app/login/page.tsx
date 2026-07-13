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

  async function devSignIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-login", { method: "POST" });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? "Dev sign-in failed");
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dev sign-in failed");
      setBusy(false);
    }
  }

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-paper px-6">
      <h1 className="text-title font-bold tracking-title text-ink">Summit</h1>
      <p className="text-body text-muted">
        {hasPasskey === undefined
          ? "Loading…"
          : hasPasskey
            ? "Sign in with your passkey."
            : "First run — register the owner passkey for this device."}
      </p>
      {hasPasskey !== undefined && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={hasPasskey ? signIn : register}
            disabled={busy}
            className="btn-primary px-6 py-3 text-body disabled:opacity-50"
          >
            {busy ? "Waiting…" : hasPasskey ? "Sign in" : "Set up passkey"}
          </button>
          {isDev && (
            <button
              type="button"
              onClick={() => void devSignIn()}
              disabled={busy}
              className="btn-ghost px-5 py-2.5 text-caption disabled:opacity-50"
            >
              Continue without passkey (dev)
            </button>
          )}
        </div>
      )}
      {error && <p className="text-caption text-danger">{error}</p>}
    </main>
  );
}
