import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${error}`,
    );
  }

  const session = await getSession();

  // CSRF check — state must match what we stored before redirecting to GitHub
  if (!state || state !== session.oauthState?.state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=invalid_state`,
    );
  }

  const { returnTo } = session.oauthState!;

  // Exchange code for access token
  // GitHub returns JSON when Accept: application/json is set
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code: code!,
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/github`,
      }),
    },
  );

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("GitHub token exchange failed:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=token_exchange_failed`,
    );
  }

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    console.error("GitHub token error:", tokens.error_description);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${tokens.error}`,
    );
  }

  // Fetch profile from GitHub API
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userResponse.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=userinfo_failed`,
    );
  }

  const githubUser = await userResponse.json();

  // GitHub may not expose email if it's private — fetch it separately
  let email = githubUser.email;
  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (emailsResponse.ok) {
      const emails: { email: string; primary: boolean; verified: boolean }[] =
        await emailsResponse.json();
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails[0]?.email ?? "";
    }
  }

  // Exchange with our auth-server — upsert user in DB, get back our RS256 JWT
  const socialRes = await fetch(
    `${process.env.AUTH_SERVER_URL}/auth/social-login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: githubUser.name ?? githubUser.login,
        picture: githubUser.avatar_url,
        provider: "github",
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

  // Clear oauth state, save user session with our own JWT
  session.oauthState = undefined;
  session.user = {
    id: String(githubUser.id),
    email,
    name: githubUser.name ?? githubUser.login,
    picture: githubUser.avatar_url,
    accessToken, // ← our RS256 JWT, not GitHub's token
    refreshToken,
    provider: "github",
    roles: jwtOrg.roles,
    org_id: jwtOrg.org_id || undefined,
    org_slug: jwtOrg.org_slug || undefined,
  };
  await session.save();

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${returnTo}`);
}
