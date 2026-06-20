"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Validate token exists on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invite token.");
    }
    setChecking(false);
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orgs/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to accept invite");
        return;
      }

      // Redirect to the new org's vault
      router.push(`/org/${data.org.slug}/secrets`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-zinc-100">
              You&apos;ve been invited
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Accept to join your team&apos;s vault
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col gap-5">
          {error ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-400 text-center">{error}</p>
              <Button
                variant="outline"
                size="md"
                onClick={() => router.push("/auth/login")}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-start gap-3">
                <svg
                  className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You need to be signed in to accept this invite. If you
                  don&apos;t have an account yet,{" "}
                  <a
                    href="/auth/register"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    create one first
                  </a>
                  , then come back to this link.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
                onClick={handleAccept}
              >
                Accept invitation
              </Button>

              <p className="text-center text-xs text-zinc-600">
                Not signed in?{" "}
                <a
                  href={`/auth/login?returnTo=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Sign in first
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
