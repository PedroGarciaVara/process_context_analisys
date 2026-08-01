import { defineConfig } from "@playwright/test";
import path from "node:path";

const artifactRoot = process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results";
const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 15_000,
  workers: 1,
  reporter: [["list"], ["./tests/e2e/ok-reporter.js"]],
  outputDir: path.join(artifactRoot, runId),
  preserveOutput: "always",
  use: {
    baseURL: process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
