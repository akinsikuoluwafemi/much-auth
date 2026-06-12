import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { organizations, organizationMembers, users } from "../db/schema";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requireOrg } from "../middleware/requireOrg";
import { audit } from "../lib/audit.js";

const router = Router();

// Post /orgs
// Creates a new org and makes the creator an admin
router.post("/", authenticate, async (req: Request, res: Response) => {
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: "name and slug are required" });
  }

  // slug must be URL-safe
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({
      error: "slug must be lowercase letters, numbers, and hyphens only",
    });
  }

  // check slug is not taken
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug));

  if (existing) {
    return res.status(400).json({ error: "slug already in use" });
  }

  // create the org
  const [org] = await db
    .insert(organizations)
    .values({ name, slug })
    .returning();

  // Make the creator an admin
  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: req.user!.sub,
    role: "admin",
  });

  await audit({
    event: "org.created",
    userId: req.user!.sub,
    organizationId: org.id,
    metadata: { name, slug },
    req,
    createdAt: new Date(),
  });
  return res.status(201).json({ org });
});

// Get /orgs/:id
// Get org details + all members - admin or member can view
router.get(
  "/:id",
  authenticate,
  requireOrg,
  authorize("users:read"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // TENANT ISOLATION — only return this org if the token's org_id matches
    // Without this check, any authenticated user could fetch any org by ID
    if (req.user!.org_id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));

    if (!org) {
      return res.status(404).json({ error: "Organisation not found" });
    }

    const members = await db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        email: users.email,
        joinedAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, id));

    return res.json({ org, members });
  },
);

// POST /orgs/:id/invite
// Add a user to the org — admin only
router.post(
  "/:id/invite",
  authenticate,
  requireOrg,
  authorize("users:write"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { email, role = "member" } = req.body;

    // Tenant isolation check
    if (req.user!.org_id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Invalid role. Must be admin, member, or viewer" });
    }

    // Find the user being invited
    const [invitedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!invitedUser) {
      return res
        .status(404)
        .json({ error: "User not found. They must register first." });
    }

    // Check they're not already a member
    const [alreadyMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, id),
          eq(organizationMembers.userId, invitedUser.id),
        ),
      );

    if (alreadyMember) {
      return res
        .status(409)
        .json({ error: "User is already a member of this org" });
    }

    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId: id,
        userId: invitedUser.id,
        role,
      })
      .returning();

    await audit({
      event: "org.member_invited",
      userId: req.user!.sub,
      organizationId: id,
      metadata: { invitedUserId: invitedUser.id, email, role },
      req,
      createdAt: new Date(),
    });
    return res.status(201).json({ membership });
  },
);

// PATCH /orgs/:id/members/:userId
// Change a member's role — admin only
router.patch(
  "/:id/members/:userId",
  authenticate,
  requireOrg,
  authorize("users:write"),
  async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (req.user!.org_id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [updated] = await db
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.organizationId, id),
          eq(organizationMembers.userId, userId as string),
        ),
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Member not found" });
    }

    await audit({
      event: "org.role_changed",
      userId: req.user!.sub,
      organizationId: id,
      metadata: { targetUserId: userId, newRole: role },
      req,
      createdAt: new Date(),
    });
    return res.json({ membership: updated });
  },
);

export default router;
