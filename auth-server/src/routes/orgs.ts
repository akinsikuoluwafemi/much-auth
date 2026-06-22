import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "../db";
import {
  organizations,
  organizationMembers,
  users,
  orgInvites,
} from "../db/schema";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requireOrg } from "../middleware/requireOrg";
import { audit } from "../lib/audit.js";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// GET /orgs
// Returns all orgs the authenticated user belongs to — used by the org switcher
router.get("/", authenticate, async (req: Request, res: Response) => {
  const memberships = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(organizationMembers.userId, req.user!.sub));

  return res.json({ orgs: memberships });
});
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
    const id = req.params.id as string;

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
// Send an email invitation — admin only
router.post(
  "/:id/invite",
  authenticate,
  requireOrg,
  authorize("users:write"),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { email, role = "member" } = req.body;

    if (req.user!.org_id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Invalid role. Must be admin, member, or viewer" });
    }

    // Check if the invitee is already a member (if they have an account)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existingUser) {
      const [alreadyMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, id),
            eq(organizationMembers.userId, existingUser.id),
          ),
        );
      if (alreadyMember) {
        return res
          .status(409)
          .json({ error: "User is already a member of this org" });
      }
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    // Expire any existing unused invite for this email+org
    await db
      .update(orgInvites)
      .set({ used: true })
      .where(
        and(
          eq(orgInvites.organizationId, id),
          eq(orgInvites.email, email),
          eq(orgInvites.used, false),
        ),
      );

    // Create new invite — expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [invite] = await db
      .insert(orgInvites)
      .values({
        organizationId: id,
        invitedByUserId: req.user!.sub,
        email,
        role,
        expiresAt,
      })
      .returning();

    const inviteUrl = `${process.env.INVITE_BASE_URL}/auth/accept-invite?token=${invite.token}`;

    // Send email via Resend
    const { error: sendError } = await resend.emails.send({
      from: "Vaultly <invites@onpeeps.com>",
      to: email,
      subject: `You've been invited to join ${org.name} on Vaultly`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #09090b; color: #f4f4f5; border-radius: 12px;">
          <div style="margin-bottom: 24px;">
            <span style="background: #4f46e5; color: white; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 600;">Vaultly</span>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #f4f4f5;">You've been invited</h2>
          <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
            You've been invited to join <strong style="color: #f4f4f5;">${org.name}</strong> as a <strong style="color: #f4f4f5;">${role}</strong>.
            This invite expires in 48 hours.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Accept invitation
          </a>
          <p style="margin: 24px 0 0; color: #52525b; font-size: 12px;">
            If you weren't expecting this invite, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return res.status(500).json({ error: "Failed to send invite email" });
    }

    await audit({
      event: "org.member_invited",
      userId: req.user!.sub,
      organizationId: id,
      metadata: { email, role },
      req,
    });

    return res
      .status(201)
      .json({ message: "Invite sent", inviteId: invite.id });
  },
);

// POST /orgs/accept-invite
// Public endpoint — validate token, add user to org
router.post(
  "/accept-invite",
  authenticate,
  async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "token is required" });

    const [invite] = await db
      .select()
      .from(orgInvites)
      .where(eq(orgInvites.token, token));

    if (!invite) return res.status(404).json({ error: "Invalid invite token" });
    if (invite.used)
      return res.status(410).json({ error: "Invite has already been used" });
    if (invite.expiresAt < new Date())
      return res.status(410).json({ error: "Invite has expired" });

    // The accepting user must be logged in and their email must match the invite
    if (req.user!.email !== invite.email) {
      return res
        .status(403)
        .json({ error: "This invite was sent to a different email address" });
    }

    const [alreadyMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, invite.organizationId),
          eq(organizationMembers.userId, req.user!.sub),
        ),
      );

    if (alreadyMember) {
      // Already a member — mark invite used and return success anyway
      await db
        .update(orgInvites)
        .set({ used: true })
        .where(eq(orgInvites.id, invite.id));
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, invite.organizationId));
      return res.json({ alreadyMember: true, org });
    }

    // Add to org
    await db.insert(organizationMembers).values({
      organizationId: invite.organizationId,
      userId: req.user!.sub,
      role: invite.role,
    });

    // Mark invite used
    await db
      .update(orgInvites)
      .set({ used: true })
      .where(eq(orgInvites.id, invite.id));

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invite.organizationId));

    await audit({
      event: "org.member_invited",
      userId: req.user!.sub,
      organizationId: invite.organizationId,
      metadata: { acceptedInvite: true, role: invite.role },
      req,
    });

    return res.json({ success: true, org, role: invite.role });
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
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    const { role } = req.body;

    if (req.user!.org_id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (userId === req.user!.sub) {
      return res.status(400).json({ error: "You cannot change your own role" });
    }

    const [targetMembership] = await db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, id),
          eq(organizationMembers.userId, userId),
        ),
      );

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (targetMembership.role === "admin" && role !== "admin") {
      const adminMemberships = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, id),
            eq(organizationMembers.role, "admin"),
          ),
        );

      if (adminMemberships.length <= 1) {
        return res.status(400).json({ error: "Cannot remove the last admin" });
      }
    }

    const [updated] = await db
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.organizationId, id),
          eq(organizationMembers.userId, userId),
        ),
      )
      .returning();

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
