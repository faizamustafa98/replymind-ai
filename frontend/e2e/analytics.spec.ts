import { test, expect, signIn, collectPageErrors } from "./support/fixtures";

const ANALYTICS = "/dashboard?view=analytics";

/** Reads the number rendered under a KPI tile label. */
async function kpi(page: import("@playwright/test").Page, label: string) {
  const text = await page.locator("body").innerText();
  const idx = text.indexOf(label);
  if (idx === -1) throw new Error(`KPI tile "${label}" not found`);
  const match = text.slice(idx + label.length, idx + label.length + 20).match(/-?\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, "")) : NaN;
}

test.describe("Analytics dashboard", () => {
  test("ANLY-01: dashboard loads without crashing", async ({ page, setUpUser }) => {
    const errors = collectPageErrors(page);

    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);
    await page.goto(ANALYTICS);

    await expect(page.getByText(/analytics/i).first()).toBeVisible();
    await expect(page.getByText(/total conversations/i)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("ANLY-04: a tenant with no data shows zeros, not a crash", async ({ page, setUpUser }) => {
    // setUpUser is freshly created, so its tenant genuinely has no activity.
    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);
    await page.goto(ANALYTICS);

    await expect(page.getByText(/total conversations/i)).toBeVisible();

    expect(await kpi(page, "TOTAL CONVERSATIONS")).toBe(0);
    expect(await kpi(page, "PENDING REVIEW")).toBe(0);
    expect(await kpi(page, "RESOLVED")).toBe(0);
    expect(await kpi(page, "TOTAL MESSAGES")).toBe(0);
  });

  // Known defect (BUG-5): the channel breakdown is hardcoded in BarChart.tsx and
  // isn't wired to any endpoint, so a zero-data tenant still sees 1.2k/1.8k/856.
  // Marked as an expected failure rather than deleted — the day the chart is
  // wired to real data this spec starts passing, and Playwright reports *that*
  // as a failure, which is the reminder to close the bug and drop this marker.
  test("ANLY-04b: channel chart reflects real data @known-bug", async ({ page, setUpUser }) => {
    test.fail(true, "BUG-5: channel chart values are hardcoded in BarChart.tsx");

    await signIn(page, setUpUser);
    await expect(page).toHaveURL(/\/inbox/);
    await page.goto(ANALYTICS);
    await expect(page.getByText(/messages by channel/i)).toBeVisible();

    const chart = page.locator("text=Messages by channel").locator("xpath=ancestor::*[3]");
    await expect(chart).not.toContainText("1.2k");
    await expect(chart).not.toContainText("1.8k");
    await expect(chart).not.toContainText("856");
  });
});
