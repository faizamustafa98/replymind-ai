import { test as base, expect, type Page } from "@playwright/test";
import { createUser, deleteUser, getEmailOtp, type TestUser } from "./supabase";

// Two account shapes cover every routing case the app has:
//   setUpUser  — an existing customer: verified + onboarded, lands in the app
//   freshUser  — a brand-new signup: held at /verify until the code is entered
export const test = base.extend<{ setUpUser: TestUser; freshUser: TestUser }>({
  setUpUser: async ({}, use) => {
    const user = await createUser({ setUp: true, label: "ready" });
    await use(user);
    await deleteUser(user.id);
  },
  freshUser: async ({}, use) => {
    const user = await createUser({ setUp: false, label: "fresh" });
    await use(user);
    await deleteUser(user.id);
  },
});

export { expect };

/** Fills and submits the sign-in form, then waits until the app has actually
 *  routed somewhere. Doesn't assert *where* — that's the gate's job, and specs
 *  assert different destinations. Waiting here keeps them from racing the
 *  redirect and asserting against a still-rendered login page. */
export async function signIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(user.email);
  // "Password" also substring-matches "Re-type password", so pin it exactly.
  await page.getByPlaceholder("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

/** Clears the email-code screen using the real OTP Supabase issued. */
export async function completeEmailVerification(page: Page, user: TestUser) {
  await page.waitForURL("**/verify");
  const boxes = page.locator("input[inputmode='numeric']");
  await expect(boxes.first()).toBeVisible();

  const otp = await getEmailOtp(user.email);
  for (let i = 0; i < otp.length; i++) {
    await boxes.nth(i).fill(otp[i]);
  }
}

/** Console/page errors collected for smoke assertions. Ignores network noise
 *  from third-party font CDNs, which is unrelated to app health. */
export function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (/fonts\.|fontshare|favicon/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}
