import { test, expect, signIn, completeEmailVerification } from "./support/fixtures";

test.describe("Signup journey — verify then onboard", () => {
  test("AUTH-03/AUTH-06: new account goes login → verify → onboarding", async ({ page, freshUser }) => {
    await signIn(page, freshUser);

    // A brand-new account must be held at the email-code step.
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.getByRole("heading", { name: /verify email/i })).toBeVisible();
    // The address being verified is the one they authenticated with, not typed.
    await expect(page.getByText(freshUser.email)).toBeVisible();
    await expect(page.locator("input[inputmode='numeric']")).toHaveCount(8);

    await completeEmailVerification(page, freshUser);

    // Correct code auto-submits and hands off to setup.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 45_000 });
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
  });

  test("AUTH-05: all three onboarding steps complete and land in the inbox", async ({ page, freshUser }) => {
    await signIn(page, freshUser);
    await completeEmailVerification(page, freshUser);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 45_000 });

    // Step 1 — business profile (name is the only required field)
    await page.getByPlaceholder("e.g. Artisan Brews Co.").fill("E2E Test Business");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2 — documents are optional at signup
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Step 3 — channels are optional too
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
    await page.getByRole("button", { name: /skip for now/i }).click();

    await expect(page).toHaveURL(/\/inbox/, { timeout: 45_000 });
  });

  test("wrong code is rejected without losing the session", async ({ page, freshUser }) => {
    await signIn(page, freshUser);
    await expect(page).toHaveURL(/\/verify/);

    const boxes = page.locator("input[inputmode='numeric']");
    await expect(boxes.first()).toBeVisible();
    for (let i = 0; i < 8; i++) await boxes.nth(i).fill("1");

    await expect(page.getByText(/expired or is invalid/i)).toBeVisible({ timeout: 45_000 });
    // Still on the code screen, still signed in — they can simply retry.
    await expect(page).toHaveURL(/\/verify/);
  });
});
