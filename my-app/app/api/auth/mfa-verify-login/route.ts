import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// POST /api/mfa/verify-login — verifies TOTP during login flow (mfaPending state)
export async function POST(request: Request) {
  const session = await getSession();

  if (!session.mfaPending?.userId) {
    return NextResponse.json(
      { error: "No pending MFA session" },
      { status: 400 },
    );
  }

  const { token } = await request.json();

  // verify-mfa checks the TOTP code and issues tokens in one shot
  const completeRes = await fetch(
    `${process.env.AUTH_SERVER_URL}/auth/verify-mfa`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.mfaPending.userId, token }),
    },
  );

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: string }).error ?? "Invalid code" },
      { status: 401 },
    );
  }

  const data = await completeRes.json();

  // Fetch user profile
  const meRes = await fetch(`${process.env.AUTH_SERVER_URL}/api/me`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  if (!meRes.ok) {
    return NextResponse.json(
      { error: "Failed to load user profile" },
      { status: 500 },
    );
  }

  const { user: tokenUser } = await meRes.json();

  // Clear mfaPending, set user in session
  session.mfaPending = undefined;
  session.user = {
    id: tokenUser.sub,
    email: tokenUser.email,
    name: tokenUser.email,
    picture: null,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    provider: "email",
    roles: tokenUser.roles,
    org_id: tokenUser.org_id || undefined,
    org_slug: tokenUser.org_slug || undefined,
  };
  await session.save();

  return NextResponse.json({ success: true });
}
