import { test, expect, signIn } from "./support/fixtures";

// The setup gate lives in proxy.ts. These are the specs that stop a
// half-finished signup from reaching real customer data.
test.describe("Route protection", () => {
  const APP_ROUTES = ["/inbox", "/dashboard?view=analytics", "/dashboard?view=documents", "/rejected"];

  test("signed-out visitors are sent to login with a return path", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login\?next=%2Finbox/);
  });

  for (const route of APP_ROUTES) {
    test(`unverified account cannot reach ${route}`, async ({ page, freshUser }) => {
      await signIn(page, freshUser);
      await expect(page).toHaveURL(/\/verify/);

      await page.goto(route);
      // Gate wins over the typed URL every time.
      await expect(page).toHaveURL(/\/verify/);
    });
  }

  test("unverified account cannot skip ahead to onboarding", async ({ page, freshUser }) => {
    await signIn(page, freshUser);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/verify/);
  });

  test("existing account goes straight to the inbox", async ({ page, setUpUser }) => {
    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("button", { name: /inbox/i }).first()).toBeVisible();
  });

  test("existing account is bounced off the setup pages", async ({ page, setUpUser }) => {
    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);

    for (const route of ["/verify", "/onboarding"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/inbox/);
    }
  });

  test("backing out of verification signs the user out", async ({ page, freshUser }) => {
    await signIn(page, freshUser);
    await expect(page).toHaveURL(/\/verify/);

    await page.getByRole("button", { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Session is genuinely gone, not just navigated away from.
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login\?next=%2Finbox/);
  });
});
