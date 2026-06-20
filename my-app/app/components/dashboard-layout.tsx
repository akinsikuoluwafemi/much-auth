import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TokenRefresher } from "./token-refresher";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function getTokenExp(token: string): number {
  try {
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ) as { exp?: number };
    return claims.exp ?? 0;
  } catch {
    return 0;
  }
}

// Server component — reads session server-side, guards all app pages
export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session.user) {
    redirect("/auth/login");
  }

  const tokenExp = session.user.accessToken
    ? getTokenExp(session.user.accessToken)
    : 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
      {tokenExp > 0 && <TokenRefresher tokenExp={tokenExp} />}
    </div>
  );
}
