import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

// GET /api/mfa/setup — initiates MFA setup, returns QR code
export async function GET() {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.provider !== "email") {
    return NextResponse.json(
      { error: "MFA setup requires email/password login" },
      { status: 400 },
    );
  }

  const res = await fetch(`${process.env.AUTH_SERVER_URL}/mfa/setup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.user.accessToken}`,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
