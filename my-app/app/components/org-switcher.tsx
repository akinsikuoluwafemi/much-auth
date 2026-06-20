"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface OrgSwitcherProps {
  currentOrgSlug?: string;
  currentOrgId?: string;
}

export function OrgSwitcher({
  currentOrgSlug,
  currentOrgId,
}: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function loadOrgs() {
    try {
      const res = await fetch("/api/orgs", { cache: "no-store" });
      const data = await res.json();
      setOrgs(data.orgs ?? []);
    } catch {
      // ignore transient network/UI errors
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  // Refresh memberships each time the menu opens so role labels stay current.
  useEffect(() => {
    if (open) loadOrgs();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = orgs.find((o) => o.id === currentOrgId);

  async function switchOrg(org: Org) {
    setOpen(false);
    if (org.id === currentOrgId) return;

    startTransition(async () => {
      const res = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id }),
      });

      if (res.ok) {
        // Hard navigate to the new org's page so the server component
        // re-runs with the freshly saved session
        router.push(`/org/${org.slug}`);
        router.refresh();
      }
    });
  }

  // Always render — single-org users still need the "New organisation" button

  return (
    <div ref={ref} className="relative px-2 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-zinc-200 border border-zinc-700/50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 rounded bg-indigo-600/80 shrink-0 flex items-center justify-center text-[9px] font-bold text-white">
            {(current?.name ?? "?")[0].toUpperCase()}
          </div>
          <span className="truncate text-xs font-medium">
            {isPending
              ? "Switching…"
              : (current?.name ?? currentOrgSlug ?? "Select org")}
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 mx-2 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 py-1 overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Your organisations
          </p>
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org)}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-zinc-800 transition-colors text-left",
                org.id === currentOrgId ? "text-zinc-100" : "text-zinc-400",
              ].join(" ")}
            >
              <div className="w-5 h-5 rounded bg-indigo-600/80 shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                {org.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-medium">{org.name}</span>
                <span className="text-[10px] text-zinc-500">{org.role}</span>
              </div>
              {org.id === currentOrgId && (
                <svg
                  className="w-3 h-3 text-indigo-400 ml-auto shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-zinc-800 mt-1 pt-1">
            <a
              href="/org/create"
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              New organisation
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
