import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }

  // Call auth-server login
  const res = await fetch(`${process.env.AUTH_SERVER_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Invalid credentials" },
      { status: 401 },
    );
  }

  // MFA required — save pending state to session, tell client
  if (data.mfaPending && data.userId) {
    const session = await getSession();
    session.mfaPending = { userId: data.userId };
    await session.save();
    return NextResponse.json({ mfaRequired: true });
  }

  // Success — fetch the user's profile from auth-server /api/me to confirm token is valid
  const meRes = await fetch(`${process.env.AUTH_SERVER_URL}/api/me`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  if (!meRes.ok) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  const { user: tokenUser } = await meRes.json();

  // Save to iron-session
  const session = await getSession();
  session.user = {
    id: tokenUser.sub,
    email: tokenUser.email,
    name: tokenUser.email, // email/password users have no separate name field yet
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
