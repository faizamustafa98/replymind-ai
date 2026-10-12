import fs from "node:fs";
import path from "node:path";

// Test-only Supabase admin helpers. Specs create their own throwaway accounts
// so a run never depends on (or mutates) real user data.

function loadEnvFile(file: string) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
}

// .env.test holds the service key (gitignored); .env supplies the public ones.
loadEnvFile(".env.test");
loadEnvFile(".env");

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

export function assertEnv() {
  const missing = [
    !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !SERVICE_KEY && "SUPABASE_SERVICE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Missing env for e2e: ${missing.join(", ")}. See e2e/README.md — put SUPABASE_SERVICE_KEY in .env.test.`
    );
  }
}

const adminHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
});

async function admin(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, { ...init, headers: adminHeaders() });
  if (!res.ok) throw new Error(`Supabase admin ${pathname} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export const TEST_PASSWORD = "QaTest1234!";

/**
 * Creates a confirmed account.
 *
 * `setUp: true` pre-sets the flags proxy.ts gates on, which is how an existing
 * customer looks — they land straight in the app. `setUp: false` leaves them
 * off, so the account behaves like a brand-new signup and gets held at /verify.
 */
export async function createUser(opts: { setUp: boolean; label?: string }): Promise<TestUser> {
  assertEnv();
  const email = `e2e.${opts.label ?? "user"}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@mailinator.com`;
  const user_metadata: Record<string, unknown> = { full_name: "E2E Test User" };
  if (opts.setUp) {
    user_metadata.email_code_verified = true;
    user_metadata.onboarding_completed = true;
  }
  const user = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: TEST_PASSWORD, email_confirm: true, user_metadata }),
  });
  return { id: user.id, email, password: TEST_PASSWORD };
}

export async function deleteUser(id: string) {
  await admin(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {
    // Teardown must never fail a passing spec.
  });
}

/** The 8-digit code the app emails — pulled straight from Supabase so the
 *  suite doesn't depend on an inbox being reachable. */
export async function getEmailOtp(email: string): Promise<string> {
  const data = await admin("/auth/v1/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const otp = data.email_otp ?? data?.properties?.email_otp;
  if (!otp) throw new Error(`No email_otp returned for ${email}`);
  return otp;
}

/** Access token for hitting the backend API directly in API-contract specs. */
export async function getAccessToken(user: TestUser): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!res.ok) throw new Error(`token grant -> ${res.status}`);
  return (await res.json()).access_token;
}
