import { DashboardLayout } from "@/app/components/dashboard-layout";
import { MfaSettingsClient } from "./mfa-client";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";

export default async function MfaSettingsPage() {
  const session = await getSession();
  if (!session.user) redirect("/auth/login");

  const provider = session.user.provider ?? "email";

  let mfaEnabled = false;
  if (provider === "email" && session.user.accessToken) {
    try {
      const res = await fetch(`${process.env.AUTH_SERVER_URL}/mfa/status`, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        mfaEnabled = data.mfaEnabled ?? false;
      }
    } catch {
      /* leave false */
    }
  }

  return (
    <DashboardLayout>
      <MfaSettingsClient provider={provider} mfaEnabled={mfaEnabled} />
    </DashboardLayout>
  );
}
