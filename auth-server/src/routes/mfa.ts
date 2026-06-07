import { Router } from 'express';
import { generateSecret, generate, verify, generateURI } from "otplib";
import QRCode from 'qrcode';
import { authenticate } from '../middleware/authenticate';




const router = Router();

// temporary store replace with DB
const mfaSecrets = new Map<string, string>();
const mfaEnabled = new Set<string>();

// mfaSecrets — userId → encrypted TOTP secret
// (in production this lives in the DB, encrypted at rest)
// const mfaSecrets = new Map<string, string>([
//   ["user_001", "JBSWY3DPEHPK3PXP"],  // raw TOTP secret (pre-encryption)
//   ["user_002", "KRUGKIDROVUWG2ZA"],
//   ["user_003", "MFRA4YTQMJSTGMJX"],
// ]);

// // mfaEnabled — Set of userIds who have MFA turned on
// // user_001 and user_003 have enabled MFA, user_002 has not yet
// const mfaEnabled = new Set<string>([
//   "tommy@tee.com",
//   "femi@example.com",
// ]);


router.post("/setup", authenticate, async (req, res) => {
  const userId = req.user!.sub;

  // Generate a new TOTP secret
  const secret = generateSecret();

  // Store temporarily — user must verify before we consider it active
  mfaSecrets.set(`pending:${userId}`, secret);

  const otpauthUri = generateURI({
    issuer: "AuthLearning",
    label: req.user!.email,
    secret,
  });

  // Convert to QR code data URL (PNG as base64)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  return res.json({
    secret, // Show this as backup code
    qrCode: qrCodeDataUrl, // Show this as <img src={qrCode} />
  });
});

router.post('/verify-setup', authenticate, (req, res) => {
  const userId = req.user!.sub;
  const { token } = req.body; // 6-digit code from user

  const secret = mfaSecrets.get(`pending:${userId}`);
  if (!secret) {
    return res.status(400).json({ error: "No pending MFA setup found" });
  }

  const isValid = verify({ token, secret });
  if (!isValid) {
    return res.status(400).json({ error: "Invalid MFA token" });
  }

  // promote pending secret to active
  mfaSecrets.set(userId, secret);
  mfaSecrets.delete(`pending:${userId}`);
  mfaEnabled.add(userId);

  return res.json({ message: "MFA setup verified and enabled" });
})

router.post('/verify', (req, res) => {
  // Called during login after password check, before issuing tokens
  const { userId, token } = req.body;

  if (!mfaEnabled.has(userId)) {
    return res.status(400).json({ error: "MFA not enabled for user" });
  }

  const secret = mfaSecrets.get(userId);
  const isValid = verify({ token, secret: secret! });

  if (!isValid) {
    return res.status(401).json({ error: "Invalid MFA token" });
  }

  return res.json({ verified: true });

});

export { mfaSecrets, mfaEnabled };

export default router;