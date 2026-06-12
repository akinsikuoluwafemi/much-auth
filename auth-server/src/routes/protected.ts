import { Request, Response, Router } from "express";
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from "../middleware/authorize.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { auditLogs } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";

const router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => {
  // req.user is guaranteed non-null here because authenticate called next()
  console.log(req.user, 'req.user in /me route');
  res.json({ user: req.user });
})

// Test RBAC — only "admin" role has "users:write"
router.get('/admin-only', authenticate, authorize('users:write'), (req, res) => {
  res.json({ message: 'You have users:write permission', user: req.user });
});

// Test RBAC — all roles have "users:read"
router.get('/members', authenticate, authorize('users:read'), (req, res) => {
  res.json({ message: 'You have users:read permission', user: req.user });
});

// Test requireOrg — needs org_id in token
router.get('/org-context', authenticate, requireOrg, (req, res) => {
  res.json({ message: 'Org context present', org_id: req.user!.org_id, org_slug: req.user!.org_slug });
});

// GET /api/audit-log — admin only, scoped to their org
router.get(
  "/audit-log",
  authenticate,
  requireOrg,
  authorize("settings:read"),
  async (req: Request, res: Response) => {

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, req.user!.org_id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
    
    return res.json({ logs });

  });

export default router;