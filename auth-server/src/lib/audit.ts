import { db } from "../db";
import { auditLogs } from "../db/schema";
import { Request } from "express";

export type AuditEvent =
  | "user.login"
  | "user.login_failed"
  | "user.logout"
  | "user.registered"
  | "mfa.enabled"
  | "mfa.verify_failed"
  | "token.reuse_detected"
  | "org.created"
  | "org.member_invited"
  | "org.role_changed";


interface AuditOptions {
  event: AuditEvent;
  userId?: string; // optional, for events not tied to a user (e.g. failed login with unknown email)
  organizationId?: string; // optional, for org-related events
  metadata?: Record<string, unknown>; // Freeform JSON for any extra details
  req?: Request; // Optional, for capturing IP, user agent, etc.
  createdAt?: Date; // Optional, defaults to now
}

function getIp(req: Request): string {
  // x-forwarded-for is set by proxies/load balancers in production
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
  }
  return req.socket.remoteAddress ?? "unknown";
}

export async function audit(options: AuditOptions): Promise<void> { 
  const { event, userId, organizationId, metadata, req, createdAt } = options;

  // add into auditlogs table
  await db.insert(auditLogs).values({
    event,
    userId: userId ?? null,
    organizationId: organizationId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: req ? getIp(req) : null,
    userAgent: req ? req.headers["user-agent"]?.toString() ?? null : null,
    createdAt: createdAt ?? new Date(),
  })
}