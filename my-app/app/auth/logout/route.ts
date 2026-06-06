import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function GET() {
  const session = await getSession();

  // Destroy the session — clears the iron-session cookie
  session.destroy();

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login`);
}
