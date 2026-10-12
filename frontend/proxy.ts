import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The real app. Reaching any of these means signup is fully finished: signed
// in, email code cleared, onboarding done.
const APP_PAGES = ["/dashboard", "/inbox", "/rejected"];
// Mid-signup steps. They need a session, but run before setup is complete.
const SETUP_PAGES = ["/verify", "/onboarding"];
const AUTH_PAGES = ["/login", "/register"];

const PROTECTED = [...APP_PAGES, ...SETUP_PAGES];

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(r + "/"));

export async function proxy(request: NextRequest) {
  // Rebuilt whenever Supabase refreshes the session cookie, so the response
  // we return always carries the latest Set-Cookie header.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // getUser() (not getSession()) revalidates the token against Supabase's
  // auth server, so a revoked/expired session can't slip through.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  const { pathname } = request.nextUrl;

  if (!loggedIn && matches(pathname, PROTECTED)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (loggedIn) {
    // Both flags live on the auth user, so this gate costs no extra request.
    // Accounts that existed before the code step was introduced were
    // backfilled as already-verified, so they aren't sent back through signup.
    const meta = user.user_metadata ?? {};
    const verified = meta.email_code_verified === true;
    const onboarded = meta.onboarding_completed === true;
    const setUp = verified && onboarded;

    // Auth pages stay reachable mid-signup: that's how "back" out of the code
    // screen works. Only a finished account gets bounced off them.
    if (AUTH_PAGES.includes(pathname)) {
      return setUp ? NextResponse.redirect(new URL("/inbox", request.url)) : response;
    }

    // Funnel every other signed-in route to whichever step is still outstanding,
    // so /inbox can't be reached by typing the URL or hitting back.
    if (!verified && pathname !== "/verify") {
      return NextResponse.redirect(new URL("/verify", request.url));
    }
    if (verified && !onboarded && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if (setUp && matches(pathname, SETUP_PAGES)) {
      return NextResponse.redirect(new URL("/inbox", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inbox/:path*",
    "/onboarding/:path*",
    "/rejected/:path*",
    "/verify",
    "/login",
    "/register",
  ],
};
