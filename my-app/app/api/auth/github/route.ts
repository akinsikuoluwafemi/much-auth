import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { generateState } from "@/app/lib/pkce";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const state = generateState();

  const session = await getSession();
  session.oauthState = {
    state,
    codeVerifier: "", // GitHub doesn't support PKCE — empty string
    returnTo,
  };
  await session.save();

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/github`,
    scope: "read:user user:email", // read:user = profile, user:email = email address
    state,
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
}
