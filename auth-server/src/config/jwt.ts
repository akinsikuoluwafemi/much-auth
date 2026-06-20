import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { SignOptions, JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// The Token Factory file

// npx tsx --env-file=.env src/config/jwt.ts (to console.log anything from a file)

// Stable key ID — bump this string when you rotate keys so consumers know to re-fetch JWKS
export const KEY_ID = "auth-server-key-1";

// load keys once at startup - not on every request (perf)
const privateKey = fs.readFileSync(
  path.resolve(process.env.JWT_PRIVATE_KEY_PATH!),
  "utf-8",
);

const publicKey = fs.readFileSync(
  path.resolve(process.env.JWT_PUBLIC_KEY_PATH!),
);

// Convert RSA public PEM → JWK format using Node's built-in crypto
// This is what gets served at /.well-known/jwks.json
const publicKeyObject = crypto.createPublicKey(publicKey);
const jwk = publicKeyObject.export({ format: "jwk" }) as Record<string, string>;

export const publicJwk = {
  ...jwk,
  kty: "RSA",
  use: "sig", // signature key, not encryption
  alg: "RS256",
  kid: KEY_ID,
};

export interface TokenPayload {
  sub: string; //subject - user ID (OIDC standard claim)
  email: string;
  roles: string[]; // e.g. ["admin"], ["member", "viewer"], etc.
  org_id: string; // ← add this
  org_slug: string; // ← add this
  jti: string; // JWT ID - unique per token, used for revocation
  iat?: number; // issued at
  exp?: number; // expiry
}

export function issueAccessToken(payload: Omit<TokenPayload, "jti">): string {
  const options: SignOptions = {
    algorithm: "RS256",
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"],
    issuer: "auth-server",
    audience: "my-app",
    keyid: KEY_ID, // ← consumers use this to look up the right key in JWKS
  };

  return jwt.sign(
    { ...payload, jti: uuidv4() }, // jti makes every token unique
    privateKey,
    options,
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  // verify() throws if expired, tampered, wrong issuer, wrong audience

  // Staff-level note: The iss (issuer) and aud (audience) claims are not just conventions — they are your first line of defense against token confusion attacks, where a token issued for one service is replayed against another.

  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: "auth-server",
    audience: "my-app",
  }) as TokenPayload;
}

// Used only by /auth/reissue — validates signature + issuer/audience but ignores
// expiry so a user with a stale token can still get a fresh one without logging out.
export function verifyAccessTokenIgnoreExpiry(token: string): TokenPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: "auth-server",
    audience: "my-app",
    ignoreExpiration: true,
  }) as TokenPayload;
}
