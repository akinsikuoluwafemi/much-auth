import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard-layout";
import { Badge } from "@/app/components/ui/badge";
import { SecretsClient } from "./secrets-client";

// Mock vault data — in production these come from the DB, encrypted at rest
const MOCK_SECRETS = [
  {
    id: "sec_01",
    name: "STRIPE_SECRET_KEY",
    type: "API Key" as const,
    value: "sk_live_4xKj9mNqR2vLpT8wYcBdEfHi3ZoAuSg7",
    lastAccessed: "2 min ago",
    accessedBy: "femi@example.com",
    createdAt: "2024-11-01",
    roles: ["admin"],
  },
  {
    id: "sec_02",
    name: "DATABASE_URL",
    type: "Database" as const,
    value: "postgresql://authuser:s3cr3t@prod-db.internal:5432/appdb",
    lastAccessed: "1 hour ago",
    accessedBy: "ci-runner@github",
    createdAt: "2024-10-15",
    roles: ["admin", "member"],
  },
  {
    id: "sec_03",
    name: "AWS_ACCESS_KEY_ID",
    type: "API Key" as const,
    value: "AKIAIOSFODNN7EXAMPLE",
    lastAccessed: "3 hours ago",
    accessedBy: "femi@example.com",
    createdAt: "2024-10-20",
    roles: ["admin"],
  },
  {
    id: "sec_04",
    name: "AWS_SECRET_ACCESS_KEY",
    type: "API Key" as const,
    value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    lastAccessed: "3 hours ago",
    accessedBy: "femi@example.com",
    createdAt: "2024-10-20",
    roles: ["admin"],
  },
  {
    id: "sec_05",
    name: "GITHUB_DEPLOY_KEY",
    type: "SSH Key" as const,
    value:
      "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQ\n-----END OPENSSH PRIVATE KEY-----",
    lastAccessed: "Yesterday",
    accessedBy: "deploy-bot@internal",
    createdAt: "2024-09-30",
    roles: ["admin"],
  },
  {
    id: "sec_06",
    name: "SENDGRID_API_KEY",
    type: "API Key" as const,
    value: "SG.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
    lastAccessed: "2 days ago",
    accessedBy: "notifications@internal",
    createdAt: "2024-11-05",
    roles: ["admin", "member"],
  },
  {
    id: "sec_07",
    name: "REDIS_URL",
    type: "Database" as const,
    value: "redis://:s3cr3tpass@prod-redis.internal:6379/0",
    lastAccessed: "5 days ago",
    accessedBy: "femi@example.com",
    createdAt: "2024-10-01",
    roles: ["admin", "member"],
  },
  {
    id: "sec_08",
    name: "SLACK_WEBHOOK_URL",
    type: "Webhook" as const,
    value:
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    lastAccessed: "1 week ago",
    accessedBy: "alerting@internal",
    createdAt: "2024-09-15",
    roles: ["admin", "member", "viewer"],
  },
];

export type Secret = (typeof MOCK_SECRETS)[number];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SecretsPage({ params }: PageProps) {
  const session = await getSession();

  if (!session.user) {
    redirect("/auth/login");
  }

  const { slug } = await params;
  const user = session.user;

  // Tenant isolation — decode org_slug from JWT claims (session field can be stale)
  let tokenOrgSlug: string | undefined;
  try {
    const claims = JSON.parse(
      Buffer.from(user.accessToken.split(".")[1], "base64url").toString(),
    ) as { org_slug?: string };
    tokenOrgSlug = claims.org_slug;
  } catch {}
  if (!tokenOrgSlug || tokenOrgSlug !== slug) {
    redirect("/dashboard");
  }

  const userRole = user.roles?.[0] ?? "viewer";

  // Filter secrets by what this role can see
  const visibleSecrets = MOCK_SECRETS.filter((s) => s.roles.includes(userRole));

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Vault</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {slug} · {visibleSecrets.length} secrets visible to{" "}
              <span className="text-zinc-400">{userRole}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Vault unlocked</span>
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <svg
            className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-xs text-amber-400 leading-relaxed">
            Every secret reveal is logged to the audit trail with your identity,
            IP address, and timestamp. Values are masked by default — click{" "}
            <strong>Reveal</strong> only when needed.
          </p>
        </div>

        {/* Secrets table */}
        <SecretsClient
          secrets={visibleSecrets}
          userEmail={user.email}
          orgSlug={slug}
        />
      </div>
    </DashboardLayout>
  );
}
