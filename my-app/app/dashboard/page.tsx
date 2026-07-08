import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DashboardLayout } from "@/app/components/dashboard-layout";
import { Badge, roleBadgeVariant } from "@/app/components/ui/badge";

// Mock vault stats — these would come from the DB in production
const MOCK_SECRET_COUNT = 12;
const MOCK_LAST_ACCESSED = "2 minutes ago";
const MOCK_ACTIVE_MEMBERS = 4;

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.user) {
    redirect("/auth/login");
  }

  const user = session.user;
  const role = user.roles?.[0] ?? "user";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const hasOrg = !!user.org_slug;

  const tiles = [
    {
      key: "secrets",
      href: hasOrg ? `/org/${user.org_slug}/secrets` : "/org/create",
      title: hasOrg ? "Vault Secrets" : "Create a Vault",
      description: hasOrg
        ? `${MOCK_SECRET_COUNT} secrets stored — API keys, DB credentials, SSH keys`
        : "Set up your first vault to start storing team secrets securely",
      icon: (
        <svg
          className="w-5 h-5 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
          />
        </svg>
      ),
      badge: hasOrg ? `${MOCK_SECRET_COUNT} secrets` : null,
      badgeVariant: "indigo" as const,
    },
    {
      key: "team",
      href: hasOrg ? `/org/${user.org_slug}` : "/org/create",
      title: hasOrg ? "Team" : "Create Organisation",
      description: hasOrg
        ? `${MOCK_ACTIVE_MEMBERS} members · RBAC enforced · last access ${MOCK_LAST_ACCESSED}`
        : "Create an org to enable team access control and RBAC",
      icon: (
        <svg
          className="w-5 h-5 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      ),
      badge: hasOrg ? "Active" : null,
      badgeVariant: "success" as const,
    },
    {
      key: "security",
      href: "/settings/mfa",
      title: "Security",
      description: "MFA, session management, and access token configuration",
      icon: (
        <svg
          className="w-5 h-5 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      ),
      badge: null,
      badgeVariant: "default" as const,
    },
    {
      key: "audit",
      href: hasOrg ? `/org/${user.org_slug}/audit` : "#",
      title: "Audit Log",
      description: hasOrg
        ? "Every secret access, login, and permission change — recorded"
        : "Enable after creating an organisation",
      icon: (
        <svg
          className="w-5 h-5 text-rose-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      ),
      badge: null,
      badgeVariant: "default" as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">
              {hasOrg ? `${user.org_slug} vault` : "Your vault"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
              {hasOrg && ` · ${role} access`}
            </p>
          </div>
          {hasOrg && (
            <div className="flex gap-2">
              <Badge variant={roleBadgeVariant[role] ?? "default"}>
                {role}
              </Badge>
              <Badge variant="zinc">{user.provider}</Badge>
            </div>
          )}
        </div>

        {/* Vault stats bar — only shown once org is set up */}
        {hasOrg && (
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Secrets stored",
                value: MOCK_SECRET_COUNT.toString(),
                color: "text-indigo-400",
              },
              {
                label: "Team members",
                value: MOCK_ACTIVE_MEMBERS.toString(),
                color: "text-emerald-400",
              },
              {
                label: "Last accessed",
                value: MOCK_LAST_ACCESSED,
                color: "text-amber-400",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1"
              >
                <span className={`text-2xl font-semibold font-mono ${color}`}>
                  {value}
                </span>
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Profile card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-4">
          {user.picture ? (
            <Image
              src={user.picture}
              alt="avatar"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-zinc-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-base font-bold shrink-0 ring-2 ring-zinc-700">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              {user.name ?? user.email}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            {user.org_id && (
              <p className="text-xs text-zinc-600 mt-0.5 font-mono truncate">
                {user.id}
              </p>
            )}
          </div>
          {/* JWT claims inline */}
          {user.org_id && (
            <div className="hidden sm:flex flex-col gap-1 text-right">
              <span className="text-xs text-zinc-600 font-mono">org_id</span>
              <span className="text-xs text-zinc-400 font-mono truncate max-w-40">
                {user.org_id}
              </span>
            </div>
          )}
        </div>

        {/* Feature tiles */}
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
            Quick access
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tiles.map((tile) => (
              <Link
                key={tile.key}
                href={tile.href}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-zinc-700 p-5 flex flex-col gap-3 transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    {tile.icon}
                  </div>
                  {tile.badge && (
                    <Badge variant={tile.badgeVariant}>{tile.badge}</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
                    {tile.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {tile.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
