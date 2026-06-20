"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export function OrgCreateClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name
  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create organisation");
        return;
      }

      // Navigate and force revalidation so the team page fetches fresh members.
      router.push(`/org/${data.org.slug}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 flex flex-col gap-8 max-w-lg">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Create organisation
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Organisations let you manage teams, roles, and access control
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-5">
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            id="name"
            label="Organisation name"
            type="text"
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <Input
              id="slug"
              label="Slug"
              type="text"
              placeholder="acme-corp"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              required
            />
            <p className="text-xs text-zinc-600">
              Used in URLs · lowercase letters, numbers, hyphens only
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full mt-1"
          >
            Create organisation
          </Button>
        </form>
      </div>

      {/* What this enables */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">
          What this enables
        </p>
        <div className="flex flex-col gap-2">
          {[
            "RBAC — assign roles (admin, member, viewer) per user",
            "Invite team members by email",
            "Audit log scoped to your organisation",
            "org_id embedded in every JWT — tenant isolation",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              <p className="text-xs text-zinc-400">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
