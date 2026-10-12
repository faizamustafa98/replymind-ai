import { test, expect } from "./support/fixtures";
import { TEST_PASSWORD } from "./support/supabase";

test.describe("Auth — validation and error handling", () => {
  test("AUTH-07: wrong password shows an error instead of crashing", async ({ page, setUpUser }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(setUpUser.email);
    await page.getByPlaceholder("Password", { exact: true }).fill("DefinitelyWrong!999");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-08: signing up with an existing email is rejected", async ({ page, setUpUser }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Full name").fill("E2E Tester");
    await page.getByPlaceholder("Work email").fill(setUpUser.email);
    await page.getByPlaceholder("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByPlaceholder("Re-type password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign up/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("AUTH-09: malformed email blocks submission", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Full name").fill("E2E Tester");
    await page.getByPlaceholder("Work email").fill("notanemail");
    await page.getByPlaceholder("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByPlaceholder("Re-type password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign up/i }).click();

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
    // Never leaves the form, so no account can be created from a bad address.
    await expect(page).toHaveURL(/\/register/);
  });

  test("AUTH-10: password below minimum length blocks submission", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Full name").fill("E2E Tester");
    await page.getByPlaceholder("Work email").fill(`e2e.short.${Date.now()}@mailinator.com`);
    await page.getByPlaceholder("Password", { exact: true }).fill("abc");
    await page.getByPlaceholder("Re-type password").fill("abc");
    await page.getByRole("button", { name: /sign up/i }).click();

    await expect(page).toHaveURL(/\/register/);
    // The unmet rule stays on screen rather than the form silently submitting.
    await expect(page.getByText("At least 8 characters")).toBeVisible();
  });

  test("AUTH-11: error text is visible and readable, not clipped", async ({ page, setUpUser }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(setUpUser.email);
    await page.getByPlaceholder("Password", { exact: true }).fill("WrongOnPurpose1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    const error = page.getByText(/invalid login credentials/i);
    await expect(error).toBeVisible();

    const box = await error.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    const color = await error.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(220, 38, 38)");
  });
});
