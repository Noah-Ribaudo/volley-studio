"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error(
        "Configuration Error: NEXT_PUBLIC_CONVEX_URL environment variable is required. " +
        "Please add it to your .env.local file to connect to the database."
      );
    }
    return new ConvexReactClient(url);
  }, []);

  // Using basic ConvexProvider until auth credentials are configured
  // Switch back to ConvexAuthProvider once AUTH_GOOGLE_ID etc are set up
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
