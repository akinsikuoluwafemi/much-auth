import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// POST /api/auth/refresh
// Silent token rotation — called by TokenRefresher before the access token expires.
// The browser cannot call auth-server /auth/refresh directly because the refresh
// token lives in iron-session (httpOnly), not in a browser-accessible cookie.
export async function POST() {
  const session = await getSession();

  if (!session.user?.refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.user.refreshToken }),
  });

  if (!res.ok) {
    // Refresh token invalid or revoked — force re-login
    await session.destroy();
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { accessToken, refreshToken: newRefreshToken } = await res.json();

  // Decode fresh claims to keep session in sync
  let claims: { org_id?: string; org_slug?: string; roles?: string[] } = {};
  try {
    claims = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
  } catch {
    /* ignore */
  }

  session.user.accessToken = accessToken;
  session.user.refreshToken = newRefreshToken;
  if (claims.org_id) session.user.org_id = claims.org_id;
  if (claims.org_slug) session.user.org_slug = claims.org_slug;
  if (claims.roles) session.user.roles = claims.roles;
  await session.save();

  return NextResponse.json({ success: true });
}
