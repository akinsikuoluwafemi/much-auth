import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard-layout";
import { Badge } from "@/app/components/ui/badge";

interface AuditLog {
  id: string;
  event: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const eventVariant: Record<
  string,
  "success" | "destructive" | "warning" | "indigo" | "default"
> = {
  "user.login": "success",
  "user.login_failed": "destructive",
  "user.logout": "default",
  "user.registered": "indigo",
  "mfa.enabled": "indigo",
  "mfa.verify_failed": "destructive",
  "token.reuse_detected": "destructive",
  "org.created": "success",
  "org.member_invited": "indigo",
  "org.role_changed": "warning",
  "secret.accessed": "warning",
  "secret.created": "success",
  "secret.deleted": "destructive",
};

async function getAuditLogs(token: string): Promise<AuditLog[]> {
  try {
    const res = await fetch(`${process.env.AUTH_SERVER_URL}/api/audit-log`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs ?? [];
  } catch {
    return [];
  }
}

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session.user) redirect("/auth/login");

  const logs = session.user.accessToken
    ? await getAuditLogs(session.user.accessToken)
    : [];

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">
            All authentication events for your organisation · most recent first
          </p>
        </div>

        {logs.length === 0 ? (
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-sm text-zinc-400">No audit events yet</p>
            <p className="text-xs text-zinc-600">
              Events appear here after login, MFA changes, org actions, and more
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-200">Events</p>
              <span className="text-xs text-zinc-500">{logs.length} total</span>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between px-5 py-3.5 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Event dot */}
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={eventVariant[log.event] ?? "default"}>
                          {log.event}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {log.ipAddress && (
                          <span className="text-xs text-zinc-600 font-mono">
                            {log.ipAddress}
                          </span>
                        )}
                        {log.metadata &&
                          Object.keys(log.metadata).length > 0 && (
                            <span className="text-xs text-zinc-600 truncate max-w-xs">
                              {Object.entries(log.metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 flex-shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
