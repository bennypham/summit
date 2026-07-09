"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

// Convex client is only used for public queries (e.g. hasPasskey on /login).
// Authenticated data is fetched server-side; the session token never enters JS.
export function Providers({ children }: { children: React.ReactNode }) {
  const convex = useMemo(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
    [],
  );

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
