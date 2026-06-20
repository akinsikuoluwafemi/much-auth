import { DashboardLayout } from "@/app/components/dashboard-layout";
import { OrgCreateClient } from "./org-create-client";

export default function OrgCreatePage() {
  return (
    <DashboardLayout>
      <OrgCreateClient />
    </DashboardLayout>
  );
}
