"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface TokenRefresherProps {
  // Unix timestamp (seconds) when the access token expires — passed from Server Component
  tokenExp: number;
}

// Invisible component that silently rotates the access token before it expires.
// Mounted inside DashboardLayout. When the timer fires it calls the BFF refresh
// endpoint, which exchanges the stored refresh token for a new access token and
// saves it back to iron-session, then calls router.refresh() to revalidate all
// server components with the fresh token.
export function TokenRefresher({ tokenExp }: TokenRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = tokenExp - now; // seconds until expiry

    if (expiresIn <= 0) {
      // Already expired — refresh immediately
      doRefresh();
      return;
    }

    // Schedule refresh 60 seconds before expiry so there's no gap
    const delay = Math.max(0, expiresIn - 60) * 1000;
    const timer = setTimeout(doRefresh, delay);
    return () => clearTimeout(timer);

    async function doRefresh() {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        // Refresh token expired or revoked — redirect to login
        router.push("/auth/login");
      } else {
        // Revalidate server components so they pick up the new token
        router.refresh();
      }
    }
  }, [tokenExp, router]);

  return null;
}
