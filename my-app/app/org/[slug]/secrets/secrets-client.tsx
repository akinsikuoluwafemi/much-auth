"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Secret } from "./page";

const TYPE_BADGE: Record<Secret["type"], { label: string; classes: string }> = {
  "API Key": {
    label: "API Key",
    classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  Database: {
    label: "Database",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  "SSH Key": {
    label: "SSH Key",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  Webhook: {
    label: "Webhook",
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
};

function maskValue(value: string): string {
  if (value.startsWith("-----BEGIN")) {
    return "-----BEGIN OPENSSH PRIVATE KEY-----\n••••••••••••••••••••••••••\n-----END OPENSSH PRIVATE KEY-----";
  }
  if (value.startsWith("postgresql://") || value.startsWith("redis://")) {
    const url = new URL(value);
    return `${url.protocol}//${url.username}:••••••••@${url.host}${url.pathname}`;
  }
  if (value.length <= 8) return "••••••••";
  const prefix = value.slice(0, 8);
  return `${prefix}${"•".repeat(Math.min(24, value.length - 8))}`;
}

interface SecretsClientProps {
  secrets: Secret[];
  userEmail: string;
  orgSlug: string;
}

export function SecretsClient({
  secrets,
  userEmail,
  orgSlug,
}: SecretsClientProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<
    { id: string; time: string; email: string }[]
  >([]);

  function handleReveal(id: string) {
    if (revealed.has(id)) {
      setRevealed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    setRevealed((prev) => new Set(prev).add(id));
    // Log the reveal locally (in production this POSTs to /api/audit)
    setAuditLog((prev) => [
      { id, time: new Date().toLocaleTimeString(), email: userEmail },
      ...prev,
    ]);
  }

  async function handleCopy(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const secretMap = Object.fromEntries(secrets.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-widest w-55">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-widest w-[90px]">
                Type
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                Value
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-widest w-35">
                Last accessed
              </th>
              <th className="px-5 py-3 w-30" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {secrets.map((secret) => {
              const isRevealed = revealed.has(secret.id);
              const isCopied = copied === secret.id;
              const badge = TYPE_BADGE[secret.type];

              return (
                <tr
                  key={secret.id}
                  className="bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-zinc-200">
                      {secret.name}
                    </span>
                  </td>

                  {/* Type badge */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="px-5 py-4 max-w-75">
                    <span
                      className={`font-mono text-xs break-all ${
                        isRevealed
                          ? "text-zinc-200 select-all"
                          : "text-zinc-600 select-none"
                      }`}
                    >
                      {isRevealed ? secret.value : maskValue(secret.value)}
                    </span>
                  </td>

                  {/* Last accessed */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-zinc-400">
                        {secret.lastAccessed}
                      </span>
                      <span className="text-xs text-zinc-600 truncate max-w-30">
                        {secret.accessedBy}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleReveal(secret.id)}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                      >
                        {isRevealed ? (
                          <>
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                              />
                            </svg>
                            Hide
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Reveal
                          </>
                        )}
                      </button>

                      {isRevealed && (
                        <button
                          onClick={() => handleCopy(secret.id, secret.value)}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {isCopied ? (
                            <>
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                                />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Live audit trail for this session */}
      {auditLog.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Session access log
            </p>
            <Link
              href={`/org/${orgSlug}/audit`}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View full audit log →
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {auditLog.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs font-mono"
              >
                <span className="text-zinc-600">{entry.time}</span>
                <span className="text-rose-400">secret.accessed</span>
                <span className="text-zinc-500">{entry.email}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-zinc-300">
                  {secretMap[entry.id]?.name ?? entry.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
