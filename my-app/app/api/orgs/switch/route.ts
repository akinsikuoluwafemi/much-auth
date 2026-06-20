import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// POST /api/orgs/switch
// Switches the user's active org context: calls auth-server to issue a fresh
// JWT scoped to the requested org, then updates the session.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orgId } = await request.json();
  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/auth/switch-org`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.user.accessToken}`,
    },
    body: JSON.stringify({ orgId }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json(err, { status: res.status });
  }

  const { accessToken } = await res.json();

  // Decode the new token to pull org context into session fields
  let newOrg: { org_id?: string; org_slug?: string; roles?: string[] } = {};
  try {
    newOrg = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
  } catch {
    /* leave empty */
  }

  session.user.accessToken = accessToken;
  session.user.org_id = newOrg.org_id || undefined;
  session.user.org_slug = newOrg.org_slug || undefined;
  session.user.roles = newOrg.roles;
  await session.save();

  return NextResponse.json({
    org_id: newOrg.org_id,
    org_slug: newOrg.org_slug,
    roles: newOrg.roles,
  });
}
