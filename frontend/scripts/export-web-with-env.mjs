import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

function parseDotEnv(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    // Strip wrapping quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) env[key] = value;
  }
  return env;
}

function loadDotEnvIntoProcessEnv(dotEnvPath) {
  if (!existsSync(dotEnvPath)) return;
  const contents = readFileSync(dotEnvPath, "utf8");
  const parsed = parseDotEnv(contents);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const dotEnvPath = path.join(process.cwd(), ".env");
loadDotEnvIntoProcessEnv(dotEnvPath);

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(pnpmCmd, ["exec", "expo", "export", "--platform", "web"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
