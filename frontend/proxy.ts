import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
// execution model: runs before routes render). This refreshes the Supabase
// auth session cookie on every navigation so server components always see a
// valid session. getClaims() verifies the JWT locally (no network round
// trip to Supabase), which keeps navigation fast -- see
// https://supabase.com/docs/guides/auth/server-side/nextjs
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // The "Try demo" path must work even when Supabase isn't configured in
  // this environment (e.g. a fresh worktree without .env.local). Skip the
  // session refresh entirely rather than crashing every request.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the session so an expiring JWT gets refreshed.
  const { data: claimsData } = await supabase.auth.getClaims();

  // MFA gate: a real signed-in user (never the demo path, which has no
  // Supabase session at all) who has enrolled a verified TOTP factor but
  // hasn't completed it in this session gets sent to the challenge page
  // before reaching anything else. Users who never enrolled a factor are
  // unaffected (currentLevel === nextLevel for them, so this is a no-op).
  const pathname = request.nextUrl.pathname;
  const isChallengePage = pathname.startsWith("/auth/mfa-challenge");
  if (claimsData?.claims && !isChallengePage) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa-challenge";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
