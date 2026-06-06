// Initiate the Flow

import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "@/app/lib/pkce";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store in session so we can verify on callback
  const session = await getSession();
  session.oauthState = { state, codeVerifier, returnTo };
  await session.save();

  // build a google authorization URL
   const params = new URLSearchParams({
     client_id: process.env.GOOGLE_CLIENT_ID!,
     redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/google`,
     response_type: "code",
     scope: "openid email profile", // openid → ID token, email + profile → user info
     state,
     code_challenge: codeChallenge,
     code_challenge_method: "S256",
     access_type: "offline", // get refresh_token too
     prompt: "consent", // always show consent (needed for refresh_token)
   });
  
   return NextResponse.redirect(
     `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
   );
}