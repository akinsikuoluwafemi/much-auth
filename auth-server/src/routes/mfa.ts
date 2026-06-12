import { Router } from "express";
import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import { authenticate } from "../middleware/authenticate.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { audit } from "../lib/audit.js";

const router = Router();

router.post("/setup", authenticate, async (req, res) => {
  const userId = req.user!.sub;

  const secret = generateSecret();

  // Save secret to DB — mfaEnabled stays false until verify-setup succeeds
  await db
    .update(users)
    .set({ mfaSecret: secret, mfaEnabled: false })
    .where(eq(users.id, userId));

  const otpauthUri = generateURI({
    issuer: "AuthLearning",
    label: req.user!.email,
    secret,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  return res.json({
    secret,
    qrCode: qrCodeDataUrl,
  });
});

router.post("/verify-setup", authenticate, async (req, res) => {
  const userId = req.user!.sub;
  const { token } = req.body;

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user?.mfaSecret) {
    return res.status(400).json({ error: "No pending MFA setup found" });
  }

  let isValid = false;
  try {
    isValid = verify({ token, secret: user.mfaSecret }) as unknown as boolean;
  } catch {
    isValid = false;
  }

  if (!isValid) {
    await audit({
      event: "mfa.verify_failed",
      userId,
      req,
      createdAt: new Date(),
    });
    return res.status(400).json({ error: "Invalid MFA token" });
  }

  // Activate MFA
  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId));
  await audit({ event: "mfa.enabled", userId, req, createdAt: new Date() });

  return res.json({ message: "MFA setup verified and enabled" });
});

export default router;
