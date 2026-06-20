import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${error}`,
    );
  }

  const session = await getSession();

  // Validate state — CSRF protection
  // If state doesn't match, someone may be trying a CSRF attack
  if (!state || state !== session.oauthState?.state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=invalid_state`,
    );
  }

  const { codeVerifier, returnTo } = session.oauthState!;

  // Exchange the code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/google`,
      grant_type: "authorization_code",
      code_verifier: codeVerifier, // This proves we initiated the request
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("Token exchange failed:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=token_exchange_failed`,
    );
  }

  const tokens = await tokenResponse.json();
  // tokens = { access_token, id_token, refresh_token, token_type, expires_in }

  // Fetch user info from Google's userinfo endpoint — more reliable than decoding the ID token
  // as it always includes picture when the profile scope is granted
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    },
  );
  const userInfo = await userInfoResponse.json();

  // Exchange with our auth-server — upsert user in DB, get back our RS256 JWT
  const socialRes = await fetch(
    `${process.env.AUTH_SERVER_URL}/auth/social-login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        provider: "google",
      }),
    },
  );

  if (!socialRes.ok) {
    const err = await socialRes.text();
    console.error("social-login failed:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=social_login_failed`,
    );
  }

  const { accessToken, refreshToken } = await socialRes.json();

  // Decode org context from our JWT so the sidebar and org pages work immediately
  let jwtOrg: { org_id?: string; org_slug?: string; roles?: string[] } = {};
  try {
    jwtOrg = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
  } catch {
    /* leave empty */
  }

  // Clear the oauth state, set the user session with our own JWT
  session.oauthState = undefined;
  session.user = {
    id: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    accessToken, // ← our RS256 JWT, not Google's token
    refreshToken,
    provider: "google",
    roles: jwtOrg.roles,
    org_id: jwtOrg.org_id || undefined,
    org_slug: jwtOrg.org_slug || undefined,
  };
  await session.save();

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${returnTo}`);

  // Staff-level note: In production, you MUST verify the id_token signature using Google's public keys from https://www.googleapis.com/oauth2/v3/certs. The decode above is fine for learning but never skip verification in production — an attacker could forge an ID token.
}
