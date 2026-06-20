import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  user?: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
    accessToken: string;
    refreshToken?: string;
    provider: "google" | "github" | "email";
    roles?: string[];
    org_id?: string;
    org_slug?: string;
  };
  // Temporarily store PKCE state during the OAuth flow
  oauthState?: {
    state: string;
    codeVerifier: string;
    returnTo: string;
  };
  // MFA pending — password check passed, TOTP code not yet entered
  mfaPending?: {
    userId: string;
  };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "auth_session",
  cookieOptions: {
    httpOnly: true, // prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV === "production", // only send cookie over HTTPS in production
    sameSite: "lax", // CSRF protection while allowing OAuth redirects
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// Why sameSite: lax not strict? With strict, the cookie is NOT sent when the user lands on your site from Google's redirect — the browser considers that a cross-site navigation. lax allows it for top-level navigations while still protecting against CSRF.
