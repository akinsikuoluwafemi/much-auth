import { Router } from "express";
import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import { authenticate } from "../middleware/authenticate.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

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

  const isValid = verify({ token, secret: user.mfaSecret });
  if (!isValid) {
    return res.status(400).json({ error: "Invalid MFA token" });
  }

  // Activate MFA
  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId));

  return res.json({ message: "MFA setup verified and enabled" });
});

export default router;
