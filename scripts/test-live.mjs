import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import net from "node:net";

// Manage only this direct child; Windows process-tree cleanup can hang in the test runner.
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(4318, "127.0.0.1", () => probe.close(resolve));
});
const env = {
  ...process.env,
  DATABASE_MODE: "local",
  APP_ORIGIN: "http://127.0.0.1:4318",
  LOCAL_DATA_DIR: path.resolve("../../work", `browser-test-${randomUUID()}`),
  OC_E2E_EXTERNAL_SERVER: "true",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:4318",
};
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4318",
  ],
  { stdio: "inherit", windowsHide: true, env },
);
let runner;
const stop = () => {
  runner?.kill();
  server.kill("SIGKILL");
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
process.on("exit", stop);
let code = 1;
try {
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline && !ready) {
    if (server.exitCode !== null)
      throw new Error("O servidor de teste não iniciou.");
    try {
      const response = await fetch(
        `${env.APP_ORIGIN}/api/manage?action=status`,
        { signal: AbortSignal.timeout(2000) },
      );
      const status = await response.json();
      if (status.storage !== "local" || !status.setupRequired)
        throw new Error("O banco de teste não está isolado e vazio.");
      ready = true;
    } catch (error) {
      if (error.message === "O banco de teste não está isolado e vazio.")
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!ready) throw new Error("O servidor de teste não respondeu.");
  runner = spawn(
    process.execPath,
    [
      "node_modules/playwright/cli.js",
      "test",
      "--config",
      process.argv.includes("--demo") ? "playwright.config.ts" : "playwright.live.config.ts",
    ],
    { stdio: "inherit", windowsHide: true, env },
  );
  code = await new Promise((resolve) => {
    runner.once("error", () => resolve(1));
    runner.once("exit", (value) => resolve(value ?? 1));
  });
} finally {
  stop();
}
process.exitCode = code;
