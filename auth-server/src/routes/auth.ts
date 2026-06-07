import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { issueAccessToken } from "../config/jwt";
import { v4 as uuidv4 } from "uuid";
import { refreshTokenStore } from "../config/refreshTokenStore";
import { mfaSecrets, mfaEnabled } from "./mfa";
import { verify } from "otplib";

const router = Router();

// simulate a user database - replace with Postgresql in phase 2
const USERS: Record<string, { hashedPassword: string; roles: string[] }> = {};

// const USERS: Record<string, { hashedPassword: string; roles: string[] }> = {
//   "femi@example.com": {
//     hashedPassword: "$2b$12$actualBcryptHashHere",
//     roles: ["OWNER", "ADMIN"],
//   },
//   "user@example.com": {
//     hashedPassword: "$2b$12$actualBcryptHashHere",
//     roles: ["MEMBER"],
//   },
// };

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  if (USERS[email]) {
    return res.status(409).json({ error: "User already exists" });
  }


  // Cost factor 12 — the work factor. Higher = slower to brute force.
  // 12 is the sweet spot: ~250ms hash time, secure enough
  const hashedPassword = await bcrypt.hash(password, 12);
  USERS[email] = { hashedPassword, roles: ["user"] };

  console.log(USERS, "USERS after registration");

  return res.status(201).json({
    message: "User created",
    user: USERS[email],
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = USERS[email];

  // CRITICAL: compare even if user doesn't exist (timing attack prevention)
  // If you return early when user is not found, an attacker can time the
  // response to enumerate valid email addresses
  const dummyHash = "$2a$12$dummy.hash.to.prevent.timing.attack";
  const storedHash = user?.hashedPassword ?? dummyHash;
  const isValid = await bcrypt.compare(password, storedHash);

  if (!user || !isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // If MFA is enabled, don't issue tokens yet — require TOTP verification first
  if (mfaEnabled.has(email)) {
    return res.json({ mfaPending: true, userId: email });
  }

  return issueTokens(res, email, user.roles);
});

// Called after password check when MFA is enabled
router.post("/verify-mfa", (req: Request, res: Response) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token required" });
  }

  if (!mfaEnabled.has(userId)) {
    return res.status(400).json({ error: "MFA not enabled for this user" });
  }

  const secret = mfaSecrets.get(userId);
  const isValid = verify({ token, secret: secret! });

  if (!isValid) {
    return res.status(401).json({ error: "Invalid MFA token" });
  }

  const user = USERS[userId];
  return issueTokens(res, userId, user.roles);
});

// Shared helper — issues access token + sets refresh token cookie
function issueTokens(res: Response, email: string, roles: string[]) {
  const accessToken = issueAccessToken({ sub: email, email, roles });

  const familyId = uuidv4();
  const refreshToken = uuidv4();

  refreshTokenStore.save(refreshToken, {
    userId: email,
    familyId,
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/auth/refresh",
  });

  return res.json({ accessToken });
}

// The sequence in your /refresh route is:
// 1. Find the token in the store
// 2. Check if already used → if yes, reuse detected → revoke family
// 3. Check if expired → if yes, reject
// 4. markUsed(refreshToken)     ← sets used: true on the OLD token
// 5. Save a brand new token     ← used: false
// 6. Set new token as cookie
// 7. Return new accessToken

// New /auth/refresh route:
router.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  const record = refreshTokenStore.find(refreshToken);

  if (!record) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // REUSE DETECTION — this is the critical security feature
  if (record.used) {
    // Someone is using a previously used token
    // This means the refresh token was stolen — revoke the entire family
    console.warn(`Refresh token reuse detected for user ${record.userId}`);
    refreshTokenStore.revokeFamily(record.familyId);
    return res
      .status(401)
      .json({ error: "Token reuse detected. Please login again." });
  }

  if (record.expiresAt < new Date()) {
    refreshTokenStore.find(refreshToken); // clean up
    return res.status(401).json({ error: "Refresh token expired" });
  }

  // Mark old token as used
  refreshTokenStore.markUsed(refreshToken);

  // Issue new token pair (rotation)
  const newRefreshToken = uuidv4();
  refreshTokenStore.save(newRefreshToken, {
    userId: record.userId,
    familyId: record.familyId, // same family
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const newAccessToken = issueAccessToken({
    sub: record.userId,
    email: record.userId,
    roles: ["user"], // fetch from DB in Phase 2
  });

  console.log({ newAccessToken, newRefreshToken });

  res.cookie("refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/auth/refresh",
  });

  return res.json({ accessToken: newAccessToken });
});

export default router;
