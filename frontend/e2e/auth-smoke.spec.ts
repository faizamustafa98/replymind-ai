import { test, expect, collectPageErrors } from "./support/fixtures";

test.describe("Auth — smoke", () => {
  test("AUTH-01: login page renders with no console errors", async ({ page }) => {
    const errors = collectPageErrors(page);

    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);

    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("AUTH-02: signup page renders with no console errors", async ({ page }) => {
    const errors = collectPageErrors(page);

    const response = await page.goto("/register");
    expect(response?.status()).toBe(200);

    await expect(page.getByPlaceholder("Full name")).toBeVisible();
    await expect(page.getByPlaceholder("Work email")).toBeVisible();
    // Every password rule should be listed up front, before anything is typed.
    await expect(page.getByText("At least 8 characters")).toBeVisible();
    await expect(page.getByText("At least one number (0-9)")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
