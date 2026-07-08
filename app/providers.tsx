"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const SessionContext = createContext<string | null>(null);

// Convex calls bypass Next.js entirely, so authed functions need the session
// token as an argument. This fetches it once (the cookie is httpOnly) and
// makes it available via useSessionToken().
export function useSessionToken(): string | null {
  return useContext(SessionContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const convex = useMemo(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
    [],
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : { sessionToken: null }))
      .then((data) => setSessionToken(data.sessionToken))
      .catch(() => setSessionToken(null));
  }, []);

  return (
    <ConvexProvider client={convex}>
      <SessionContext.Provider value={sessionToken}>
        {children}
      </SessionContext.Provider>
    </ConvexProvider>
  );
}
