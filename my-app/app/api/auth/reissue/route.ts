import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// GET /api/auth/reissue?returnTo=/some/path
// Called by Server Components that detect a stale/expired token.
// Route Handlers CAN write cookies — Server Components cannot.
// Flow: page detects stale token → redirects here → we reissue + save → redirect back.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  // Guard: never redirect back to this handler — prevents infinite redirect loops
  if (returnTo.startsWith("/api/auth/reissue")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const session = await getSession();
  if (!session.user?.accessToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  try {
    const reissueRes = await fetch(
      `${process.env.AUTH_SERVER_URL}/auth/reissue`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      },
    );

    if (!reissueRes.ok) {
      // Token is invalid/forged — force login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const { accessToken, refreshToken } = await reissueRes.json();

    // Decode org context from fresh token
    let claims: { org_id?: string; org_slug?: string; roles?: string[] } = {};
    try {
      claims = JSON.parse(
        Buffer.from(accessToken.split(".")[1], "base64url").toString(),
      );
    } catch {
      /* leave empty */
    }

    session.user.accessToken = accessToken;
    if (refreshToken) session.user.refreshToken = refreshToken;
    if (claims.org_id) session.user.org_id = claims.org_id;
    if (claims.org_slug) session.user.org_slug = claims.org_slug;
    if (claims.roles) session.user.roles = claims.roles;
    await session.save(); // ✅ Route Handler — allowed to write cookies
  } catch {
    // Reissue failed — still redirect back and let the page show its error state
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
