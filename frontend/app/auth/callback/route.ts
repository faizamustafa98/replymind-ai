import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

// OAuth (Google) redirect target. Supabase sends the user back here with a
// short-lived `code`; we exchange it for a session — which sets the auth
// cookies via the server client — then forward the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inbox";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Always aim at the app; proxy.ts owns the setup gate and diverts a
      // first-time account to /verify then /onboarding. Keeping that decision
      // in one place stops the two from disagreeing.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — bounce back to login with a flag the
  // form can surface.
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
