import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function DashboardPage() {
  const session = await getSession();

  console.log(session.user, 'session.user in dashboard page');

  if (!session.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium">Dashboard</span>
          <a
            href="/auth/logout"
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex items-center gap-5">
          {session.user.picture && (
            <Image
              src={session.user.picture}
              alt="avatar"
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-lg font-semibold">{session.user.name}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {session.user.email}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
            Session data
          </p>
          <pre className="text-xs text-neutral-600 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(session.user, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
