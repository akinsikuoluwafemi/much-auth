import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Read org context from the JWT directly — session fields may be stale/undefined
  let tokenOrgSlug: string | undefined;
  let tokenOrgId: string | undefined;
  try {
    const claims = JSON.parse(
      Buffer.from(
        session.user.accessToken.split(".")[1],
        "base64url",
      ).toString(),
    ) as { org_slug?: string; org_id?: string };
    tokenOrgSlug = claims.org_slug;
    tokenOrgId = claims.org_id;
  } catch {
    /* fall through to 403 */
  }

  if (!tokenOrgSlug || tokenOrgSlug !== slug || !tokenOrgId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();

  const res = await fetch(
    `${process.env.AUTH_SERVER_URL}/orgs/${tokenOrgId}/invite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.user.accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
