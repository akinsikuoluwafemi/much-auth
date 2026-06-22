"use client";

import React, { useState } from "react";
import { Badge, roleBadgeVariant } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface Member {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface OrgMembersClientProps {
  orgSlug: string;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}

export function OrgMembersClient({
  orgSlug,
  members,
  currentUserId,
  isAdmin,
}: OrgMembersClientProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState(members);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRole(userId);
    setRoleChangeError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRoleChangeError(data.error ?? "Failed to update role");
        return;
      }
      setMemberList((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
      );
    } catch {
      setRoleChangeError("Something went wrong");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to send invite");
        return;
      }

      setSuccess(`Invite sent to ${email}`);
      setEmail("");
      setRole("member");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const adminCount = memberList.filter(
    (member) => member.role === "admin",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Members table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-200">Members</p>
          <span className="text-xs text-zinc-500">
            {memberList.length} total
          </span>
        </div>
        {roleChangeError && (
          <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-xs text-red-400">{roleChangeError}</p>
          </div>
        )}
        <div className="divide-y divide-zinc-800">
          {memberList.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between px-5 py-4 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                  {member.email.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {member.email}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {isAdmin ? (
                (() => {
                  const isSelf = member.userId === currentUserId;
                  const isLastAdmin =
                    member.role === "admin" && adminCount === 1;

                  return (
                    <select
                      value={member.role}
                      disabled={
                        changingRole === member.userId || isSelf || isLastAdmin
                      }
                      onChange={(e) =>
                        handleRoleChange(member.userId, e.target.value)
                      }
                      className="h-7 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  );
                })()
              ) : (
                <Badge variant={roleBadgeVariant[member.role] ?? "default"}>
                  {member.role}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite form — admin only */}
      {isAdmin && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Invite a team member
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              They&apos;ll receive an email with a link to join this vault
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <svg
                className="w-4 h-4 text-emerald-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-emerald-400">{success}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <svg
                className="w-4 h-4 text-red-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                id="invite-email"
                label="Email address"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              Send invite
            </Button>
          </form>

          <div className="flex gap-4 text-xs text-zinc-600">
            <span>
              <span className="text-zinc-400 font-medium">Admin</span> — full
              access, can invite members
            </span>
            <span>
              <span className="text-zinc-400 font-medium">Member</span> — read
              most secrets
            </span>
            <span>
              <span className="text-zinc-400 font-medium">Viewer</span> —
              read-only, no sensitive secrets
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
