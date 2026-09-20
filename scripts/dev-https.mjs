import { spawn } from "node:child_process";
// The development callback is registered on this exact HTTPS origin.
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
    "--experimental-https",
    "--experimental-https-key",
    ".local-data/tls/localhost.key",
    "--experimental-https-cert",
    ".local-data/tls/localhost.crt",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, APP_ORIGIN: "https://127.0.0.1:3000" },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
