import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// GET /api/orgs — list all orgs the current user belongs to (for org switcher)
export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // If the access token is expired, bounce through the reissue handler first.
  // The reissue handler saves the fresh token to the session cookie and redirects
  // back — but since this is a fetch() from the client we can't redirect, so we
  // reissue inline here (Route Handlers CAN write cookies).
  let token = session.user.accessToken;
  try {
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ) as { exp?: number };
    const isExpired =
      claims.exp != null ? claims.exp < Math.floor(Date.now() / 1000) : false;
    if (isExpired) {
      const reissueRes = await fetch(
        `${process.env.AUTH_SERVER_URL}/auth/reissue`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (reissueRes.ok) {
        const { accessToken: freshToken, refreshToken } =
          await reissueRes.json();
        const freshClaims = JSON.parse(
          Buffer.from(freshToken.split(".")[1], "base64url").toString(),
        ) as { org_id?: string; org_slug?: string; roles?: string[] };
        session.user.accessToken = freshToken;
        if (refreshToken) session.user.refreshToken = refreshToken;
        if (freshClaims.org_id) session.user.org_id = freshClaims.org_id;
        if (freshClaims.org_slug) session.user.org_slug = freshClaims.org_slug;
        if (freshClaims.roles) session.user.roles = freshClaims.roles;
        await session.save();
        token = freshToken;
      }
    }
  } catch {
    /* use existing token */
  }

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/orgs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// POST /api/orgs — create an organisation
export async function POST(request: Request) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/orgs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.user.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok && data.org) {
    // Immediately switch JWT scope to the newly created org.
    // A generic reissue may pick an older membership when users belong to multiple orgs.
    const switchRes = await fetch(
      `${process.env.AUTH_SERVER_URL}/auth/switch-org`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        body: JSON.stringify({ orgId: data.org.id }),
      },
    );

    if (switchRes.ok) {
      const { accessToken } = await switchRes.json();
      session.user.accessToken = accessToken;

      try {
        const claims = JSON.parse(
          Buffer.from(accessToken.split(".")[1], "base64url").toString(),
        ) as { org_id?: string; org_slug?: string; roles?: string[] };
        if (claims.org_id) session.user.org_id = claims.org_id;
        if (claims.org_slug) session.user.org_slug = claims.org_slug;
        if (claims.roles) session.user.roles = claims.roles;
      } catch {
        session.user.org_id = data.org.id;
        session.user.org_slug = data.org.slug;
        session.user.roles = ["admin"];
      }
    } else {
      // Fallback: keep session aligned with newly created org even if switch fails.
      session.user.org_id = data.org.id;
      session.user.org_slug = data.org.slug;
      session.user.roles = ["admin"];
    }

    await session.save();
  }

  return NextResponse.json(data, { status: res.status });
}
