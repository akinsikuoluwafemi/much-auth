import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { issueAccessToken } from '../config/jwt';

const router = Router();

// simulate a user database - replace with Postgresql in phase 2
const USERS: Record<string, { hashedPassword: string; roles: string[] }> = {};


router.post('/register', async (req: Request, res: Response) => {
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
  USERS[email] = { hashedPassword, roles: ['user'] };


  console.log(USERS, 'USERS after registration')

  return res.status(201).json({
    message: 'User created',
    user: USERS[email] 
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = USERS[email];

  // CRITICAL: compare even if user doesn't exist (timing attack prevention)
  // If you return early when user is not found, an attacker can time the
  // response to enumerate valid email addresses
   const dummyHash = "$2a$12$dummy.hash.to.prevent.timing.attack";
   const storedHash = user?.hashedPassword ?? dummyHash;
  const isValid = await bcrypt.compare(password, storedHash);
  
  if (!user || !isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = issueAccessToken({
    sub: email,
    email,
    roles: user.roles
  })

  return res.json({ accessToken });
})

export default router;