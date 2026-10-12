"use server";

import { createClient } from "@/src/lib/supabase/server";

// Email-code step that sits between a Google sign-in and onboarding.
//
// Google hands back an already-verified address, so this code is a deliberate
// product step rather than a security requirement: it confirms the person
// finishing signup can actually read mail at the account they picked. Supabase
// Auth owns the code itself (generation, expiry, attempt limits) — we only
// trigger it and record that the account cleared it.

const NOT_SIGNED_IN = "You must be signed in to verify your email.";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Which address we're verifying, and whether this account already cleared the
 *  step — so a returning user isn't sent an unnecessary code. */
export async function getVerificationTarget() {
  const { user } = await currentUser();
  if (!user?.email) return { email: null, alreadyVerified: false, error: NOT_SIGNED_IN };

  return {
    email: user.email,
    alreadyVerified: user.user_metadata?.email_code_verified === true,
    error: null,
  };
}

export async function sendVerificationCode() {
  const { supabase, user } = await currentUser();
  if (!user?.email) return { error: NOT_SIGNED_IN };

  // shouldCreateUser:false — by this point the address always belongs to an
  // existing account, and a typo should never quietly mint a second one.
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) return { error: error.message };
  return { error: null };
}

/** Called when the last onboarding step finishes. Recorded on the auth user
 *  (not the tenant) so proxy.ts can gate every request on it without a
 *  round-trip to the API — the backend's TenantUpdate doesn't accept this
 *  field anyway. */
export async function completeOnboarding() {
  const { supabase, user } = await currentUser();
  if (!user) return { error: NOT_SIGNED_IN };

  const { error } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function verifyCode(token: string) {
  const { supabase, user } = await currentUser();
  if (!user?.email) return { error: NOT_SIGNED_IN };

  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token,
    type: "email",
  });
  if (error) return { error: error.message };

  // Remember the account cleared this step, so /auth/callback can send them
  // straight into the app on every later sign-in instead of re-verifying.
  const { error: flagError } = await supabase.auth.updateUser({
    data: { email_code_verified: true },
  });
  if (flagError) return { error: flagError.message };

  return { error: null };
}
