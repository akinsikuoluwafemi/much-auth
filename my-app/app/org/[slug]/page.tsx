import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { DashboardLayout } from "@/app/components/dashboard-layout";
import { OrgMembersClient } from "./members-client";

interface Member {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface OrgData {
  org: { id: string; name: string; slug: string; createdAt: string };
  members: Member[];
}

async function getOrgData(
  orgId: string,
  token: string,
): Promise<OrgData | null> {
  try {
    const res = await fetch(`${process.env.AUTH_SERVER_URL}/orgs/${orgId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// cache() wraps Date.now() so React 19 treats it as stable within one render.
// The value is fixed per request since connection() opts this page into
// dynamic rendering (a new render = a new request = a new timestamp).
const getServerTime = cache(() => Math.floor(Date.now() / 1000));

function jwtClaims(token: string): {
  org_id?: string;
  org_slug?: string;
  exp?: number;
} {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return {};
  }
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session.user) redirect("/auth/login");

  const { slug } = await params;

  // connection() opts this page into dynamic rendering, which allows
  // impure functions like Date.now() used in token expiry checks below.
  await connection();

  const token = session.user.accessToken;

  // Server Components cannot write cookies, so we can't save a reissued token here.
  // Instead, detect a stale token and bounce through the /api/auth/reissue Route Handler
  // which CAN write cookies, then redirects back — transparent to the user.
  if (token) {
    const claims = jwtClaims(token);
    const isExpired = claims.exp != null ? claims.exp < getServerTime() : false;
    const hasNoOrg = !claims.org_id;

    if (isExpired || hasNoOrg) {
      redirect(`/api/auth/reissue?returnTo=/org/${slug}`);
    }
  }

  // Use org_id from the (now-fresh) token; fall back to whatever is in session
  const orgId = jwtClaims(token ?? "").org_id ?? session.user.org_id;
  const data = orgId && token ? await getOrgData(orgId, token) : null;

  const isAdmin = session.user.roles?.includes("admin") ?? false;

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">
              {data?.org.name ?? slug}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Team members and access control
            </p>
          </div>
          <a
            href={`/org/${slug}/audit`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View audit log →
          </a>
        </div>

        {!data ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 flex flex-col items-center gap-3 text-center">
            <svg
              className="w-8 h-8 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-zinc-400">
              Could not load organisation data.
            </p>
            <p className="text-xs text-zinc-600">
              This feature requires email/password login with a JWT from the
              auth server.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total members", value: data.members.length },
                {
                  label: "Admins",
                  value: data.members.filter((m) => m.role === "admin").length,
                },
                { label: "Org slug", value: data.org.slug },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                  <p className="text-xl font-semibold text-zinc-100 mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <OrgMembersClient
              orgSlug={slug}
              members={data.members}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
