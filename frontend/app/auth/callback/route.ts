import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the Supabase OAuth code for a session, then redirects into the app. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth/callback] exchange failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
