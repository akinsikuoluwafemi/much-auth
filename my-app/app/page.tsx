import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";

export default async function Home() {
  const session = await getSession();

  if (session.user) {
    redirect("/dashboard");
  }

  redirect("/auth/login");
}
