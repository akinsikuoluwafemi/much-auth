import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { issueAccessToken } from "../config/jwt.js";
import { v4 as uuidv4 } from "uuid";
import { refreshTokenStore } from "../config/refreshTokenStore.js";
import { verify } from "otplib";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { organizationMembers, organizations } from "../db/schema";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  // Cost factor 12 — the work factor. Higher = slower to brute force.
  // 12 is the sweet spot: ~250ms hash time, secure enough
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();

  return res.status(201).json({
    message: "User created",
    user: { id: user.id, email: user.email },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  // CRITICAL: compare even if user doesn't exist (timing attack prevention)
  // If you return early when user is not found, an attacker can time the
  // response to enumerate valid email addresses
  const dummyHash = "$2a$12$dummy.hash.to.prevent.timing.attack";
  const storedHash = user?.passwordHash ?? dummyHash;
  const isValid = await bcrypt.compare(password, storedHash);

  if (!user || !isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // If MFA is enabled, don't issue tokens yet — require TOTP verification first
  if (user.mfaEnabled) {
    return res.json({ mfaPending: true, userId: user.id });
  }

  return issueTokens(res, user.id, user.email);
});

// Called after password check when MFA is enabled
router.post("/verify-mfa", async (req: Request, res: Response) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token required" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(400).json({ error: "MFA not enabled for this user" });
  }

  const isValid = verify({ token, secret: user.mfaSecret });

  if (!isValid) {
    return res.status(401).json({ error: "Invalid MFA token" });
  }

  return issueTokens(res, user.id, user.email);
});

// Shared helper — issues access token + sets refresh token cookie
async function issueTokens(res: Response, userId: string, email: string) {
   const [membership] = await db
     .select({
       role: organizationMembers.role,
       orgId: organizations.id,
       orgSlug: organizations.slug,
     })
     .from(organizationMembers)
     .innerJoin(
       organizations,
       eq(organizations.id, organizationMembers.organizationId),
     )
     .where(eq(organizationMembers.userId, userId))
     .limit(1);

  const accessToken = issueAccessToken({
    sub: userId,
    email,
    roles: membership ? [membership.role] : ['user'],
    org_id: membership?.orgId ?? '',
    org_slug: membership?.orgSlug ?? '',
  });

  const familyId = uuidv4();
  const refreshToken = uuidv4();

  await refreshTokenStore.save(refreshToken, {
    userId,
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

  const record = await refreshTokenStore.find(refreshToken);

  if (!record) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // REUSE DETECTION — this is the critical security feature
  if (record.used) {
    // Someone is using a previously used token
    // This means the refresh token was stolen — revoke the entire family
    console.warn(`Refresh token reuse detected for user ${record.userId}`);
    await refreshTokenStore.revokeFamily(record.familyId);
    return res
      .status(401)
      .json({ error: "Token reuse detected. Please login again." });
  }

  if (record.expiresAt < new Date()) {
    return res.status(401).json({ error: "Refresh token expired" });
  }

  // Mark old token as used
  await refreshTokenStore.markUsed(refreshToken);

  // Issue new token pair (rotation)
  const newRefreshToken = uuidv4();
  await refreshTokenStore.save(newRefreshToken, {
    userId: record.userId,
    familyId: record.familyId,
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, record.userId));
  const newAccessToken = issueAccessToken({
    sub: record.userId,
    email: user.email,
    roles: ["user"],
    org_id: "",
    org_slug: ""
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
