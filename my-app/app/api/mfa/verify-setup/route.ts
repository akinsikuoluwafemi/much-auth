import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// POST /api/mfa/verify-setup — confirms the TOTP code to activate MFA
export async function POST(request: Request) {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { token } = await request.json();

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/mfa/verify-setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.user.accessToken}`,
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
