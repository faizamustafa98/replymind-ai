import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { test, expect, signIn, collectPageErrors } from "./support/fixtures";

const DOCUMENTS = "/dashboard?view=documents";

/** Writes a throwaway file and returns its path; cleaned up after the run. */
function tempFile(name: string, contents: Buffer | string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "replymind-e2e-"));
  const file = path.join(dir, name);
  fs.writeFileSync(file, contents);
  return file;
}

test.describe("Knowledge base — documents", () => {
  test.beforeEach(async ({ page, setUpUser }) => {
    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);
    await page.goto(DOCUMENTS);
  });

  test("KB-01: documents page loads without errors", async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByText(/knowledge base/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /upload/i }).first()).toBeVisible();
    // A brand-new tenant has none — the empty state must render, not a crash.
    await expect(page.getByText(/no documents uploaded yet/i)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("KB-05/KB-12: unsupported file type is rejected with a clear message", async ({ page }) => {
    await page.getByRole("button", { name: /upload/i }).first().click();

    const input = page.locator("input[type=file]");
    // Enforcement starts at the picker itself.
    await expect(input).toHaveAttribute("accept", ".pdf,.docx,.txt");

    await input.setInputFiles(tempFile("malware.exe", Buffer.from("MZ\x90\x00fake", "binary")));
    await expect(page.getByText(/unsupported format "\.exe"/i)).toBeVisible();
  });

  test("KB-06: oversized file is rejected", async ({ page }) => {
    await page.getByRole("button", { name: /upload/i }).first().click();

    // 11 MB — one over the documented 10 MB ceiling.
    const big = tempFile("too-big.txt", Buffer.alloc(11 * 1024 * 1024, "A"));
    await page.locator("input[type=file]").setInputFiles(big);

    await expect(page.getByText(/larger than 10 MB/i)).toBeVisible();
  });

  test("KB-02/KB-04/KB-08/KB-09: valid upload ingests and becomes ready", async ({ page }) => {
    await page.getByRole("button", { name: /upload/i }).first().click();

    const doc = tempFile(
      "e2e-policy.txt",
      "Delivery in Karachi costs Rs 200 and takes 2-3 days. Returns accepted within 7 days."
    );
    await page.locator("input[type=file]").setInputFiles(doc);

    // Appears in the list, then the background chunking pipeline flips it to Ready.
    await expect(page.getByText("e2e-policy.txt")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible({ timeout: 60_000 });

    // Clean up so repeat runs start from the same empty state.
    await page.getByRole("button", { name: /delete/i }).first().click();
    const confirm = page.getByRole("button", { name: /^delete$/i }).last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  });

  test("KB-03: business info edits persist across a reload", async ({ page }) => {
    const value = `E2E Location ${Date.now()}`;
    const field = page.getByPlaceholder("e.g. 123 Main Street, Lahore");

    await field.fill(value);
    // Wait for the save to actually land — reloading before the PATCH resolves
    // would just re-read the old value and fail for the wrong reason.
    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/documents/business-info") && r.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: /save info/i }).click();
    expect((await saved).status()).toBe(200);

    await page.reload();
    await expect(page.getByPlaceholder("e.g. 123 Main Street, Lahore")).toHaveValue(value, { timeout: 30_000 });
  });
});
