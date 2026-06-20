import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/orgs/accept-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.user.accessToken}`,
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  if (res.ok && data.success) {
    // Reissue fresh JWT so org_id/roles are baked into the token
    const reissueRes = await fetch(
      `${process.env.AUTH_SERVER_URL}/auth/reissue`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      },
    );

    if (reissueRes.ok) {
      const { accessToken: freshToken, refreshToken } = await reissueRes.json();
      session.user.accessToken = freshToken;
      if (refreshToken) session.user.refreshToken = refreshToken;
      // Decode claims from the fresh token — source of truth for org context
      try {
        const claims = JSON.parse(
          Buffer.from(freshToken.split(".")[1], "base64url").toString(),
        ) as { org_id?: string; org_slug?: string; roles?: string[] };
        if (claims.org_id) session.user.org_id = claims.org_id;
        if (claims.org_slug) session.user.org_slug = claims.org_slug;
        if (claims.roles?.length) session.user.roles = claims.roles;
      } catch {}
    } else {
      // Reissue failed — fall back to invite response data
      session.user.org_id = data.org.id;
      session.user.org_slug = data.org.slug;
      session.user.roles = [data.role];
    }
    await session.save();
  }

  return NextResponse.json(data, { status: res.status });
}
