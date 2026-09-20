import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
export default defineConfig({
  testDir: "./tests/live",
  outputDir: "test-results/live",
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4318",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer:
    process.env.OC_E2E_EXTERNAL_SERVER === "true"
      ? undefined
      : {
          command:
            "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4318",
          url: "http://127.0.0.1:4318",
          reuseExistingServer: false,
          timeout: 120000,
          env: {
            DATABASE_MODE: "local",
            APP_ORIGIN: "http://127.0.0.1:4318",
            LOCAL_DATA_DIR: path.resolve(
              "../../work",
              `browser-test-${randomUUID()}`,
            ),
          },
        },
});
