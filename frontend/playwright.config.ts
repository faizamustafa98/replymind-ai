import { defineConfig, devices } from "@playwright/test";

// E2E suite runs against the deployed app by default so it can be run from any
// machine (and from CI) without booting the dev server. Point E2E_BASE_URL at
// http://localhost:3000 to run it against a local `npm run dev` instead.
const baseURL = process.env.E2E_BASE_URL ?? "https://replymindai.netlify.app";

export default defineConfig({
  testDir: "./e2e",
  // Specs seed and tear down their own Supabase users, so they're independent.
  // Concurrency is capped at 2 because Supabase rate-limits sign-in attempts per
  // project: at 4 workers, logins start being throttled and specs fail on the
  // throttle rather than on real behaviour.
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // The app talks to Railway + Supabase on almost every action, so the default
  // 5s expect timeout is too tight for a hosted run.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
