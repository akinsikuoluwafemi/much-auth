import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// PATCH /api/orgs/[slug]/members/[userId]
// Change a member's role — admin only. Proxies to auth-server which enforces RBAC.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const { role } = await req.json();

  // Read org_id from JWT claims — source of truth, never from session fields
  let orgId: string | undefined;
  try {
    const claims = JSON.parse(
      Buffer.from(
        session.user.accessToken.split(".")[1],
        "base64url",
      ).toString(),
    ) as { org_id?: string };
    orgId = claims.org_id;
  } catch {}

  if (!orgId) {
    return NextResponse.json(
      { error: "No org context in token" },
      { status: 403 },
    );
  }

  const res = await fetch(
    `${process.env.AUTH_SERVER_URL}/orgs/${orgId}/members/${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.user.accessToken}`,
      },
      body: JSON.stringify({ role }),
    },
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
