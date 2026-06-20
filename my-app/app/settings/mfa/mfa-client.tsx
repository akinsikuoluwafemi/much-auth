"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

interface MfaSettingsClientProps {
  provider: string;
  mfaEnabled: boolean;
}

export function MfaSettingsClient({
  provider,
  mfaEnabled,
}: MfaSettingsClientProps) {
  const isSocialUser = provider !== "email";
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "setup" | "done">(
    mfaEnabled ? "done" : "idle",
  );
  const [justEnabled, setJustEnabled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mfa/setup");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start MFA setup");
        return;
      }
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("setup");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (token.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mfa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }
      setStep("done");
      setJustEnabled(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">MFA Setup</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Protect your account with time-based one-time passwords (TOTP)
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
          How it works
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: "01", text: "Click 'Enable MFA' to generate a QR code" },
            {
              step: "02",
              text: "Scan the QR code with Google Authenticator or Authy",
            },
            { step: "03", text: "Enter the 6-digit code to confirm setup" },
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-2">
              <span className="text-xs font-mono text-indigo-400">
                {item.step}
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-5">
        {isSocialUser ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200 capitalize">
                  {provider} sign-in detected
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  MFA is managed by your {provider} account
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Because you signed in with {provider}, two-factor authentication
              is handled by {provider} directly. To strengthen your account
              security, enable 2-Step Verification in your{" "}
              <span className="text-indigo-400 font-medium">
                {provider} security settings
              </span>
              .
            </p>
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-zinc-100">
                MFA enabled
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Your account is protected with two-factor authentication.
              </p>
            </div>
            <Badge variant="success">Active</Badge>
            {justEnabled && (
              <>
                <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="text-xs text-amber-400 leading-relaxed text-center">
                    Sign in again to verify your authenticator is working before
                    your session expires.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  loading={signingOut}
                  onClick={() => {
                    setSigningOut(true);
                    router.push("/auth/logout");
                  }}
                >
                  Sign in again to confirm
                </Button>
              </>
            )}
          </div>
        ) : step === "idle" ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Two-factor authentication
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Currently disabled
                </p>
              </div>
              <Badge variant="zinc">Disabled</Badge>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSetup}
              loading={loading}
              variant="primary"
              size="md"
            >
              Enable MFA
            </Button>
          </div>
        ) : (
          // Setup step — show QR code
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-zinc-400 text-center">
                Scan this QR code with your authenticator app
              </p>
              {qrCode && (
                <div className="p-3 bg-white rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              )}
              {secret && (
                <div className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-500 mb-1">
                    Manual entry code
                  </p>
                  <p className="text-xs font-mono text-zinc-300 break-all">
                    {secret}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <Input
                id="token"
                label="Verification code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
              >
                Confirm and enable
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
        <p className="text-xs text-indigo-400 leading-relaxed">
          <span className="font-semibold">Why this matters:</span> TOTP uses the
          HMAC-SHA1 algorithm with the current time as input, producing a
          6-digit code that changes every 30 seconds. Even if an attacker has
          your password, they can&apos;t log in without the current code from
          your physical device.
        </p>
      </div>
    </div>
  );
}
