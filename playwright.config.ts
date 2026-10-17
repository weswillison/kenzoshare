import { defineConfig, devices } from "@playwright/test";
import { baseURL, supabaseURL } from "./e2e/settings";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: {
    command: `node --experimental-strip-types e2e/check-setup.mjs && npm run build && npm run start -- --port ${new URL(baseURL).port || "80"}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseURL,
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
