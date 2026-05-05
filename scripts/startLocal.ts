import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = process.cwd();
const API_PORT = "3001";
const UI_PORT = "3000";
const DEV_TOKEN = "dev-api-token";

function parseEnv(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    map.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1));
  }
  return map;
}

function writeEnvFile(filePath: string, required: Record<string, string>) {
  const existing = fs.existsSync(filePath) ? parseEnv(fs.readFileSync(filePath, "utf8")) : new Map<string, string>();
  for (const [k, v] of Object.entries(required)) existing.set(k, v);
  const lines = Array.from(existing.entries()).map(([k, v]) => `${k}=${v}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function loadDotenv(): Record<string, string> {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(parseEnv(fs.readFileSync(envPath, "utf8")));
}

function npmCommand(): string { return process.platform === "win32" ? "npm.cmd" : "npm"; }
function tsxCommand(): string { return process.platform === "win32" ? "tsx.cmd" : "tsx"; }

function start(name: string, cmd: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(cmd, args, { stdio: "inherit", env, cwd: ROOT, shell: process.platform === "win32" });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[${name}] exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"})`);
      shutdown(1);
    }
  });
  child.on("error", (error) => {
    console.error(`[${name}] failed to start:`, error);
    shutdown(1);
  });
  return child;
}

let shuttingDown = false;
let children: ChildProcess[] = [];
function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250);
}

function lanIPv4(): string | null {
  const nets = os.networkInterfaces();
  for (const ni of Object.values(nets)) {
    if (!ni) continue;
    for (const addr of ni) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return null;
}

export function run(lanMode = false) {
  const host = lanMode ? "0.0.0.0" : "127.0.0.1";
  const lanIp = lanMode ? lanIPv4() : null;
  const apiBaseUrl = `http://${lanMode && lanIp ? lanIp : "127.0.0.1"}:${API_PORT}`;

  // Load .env so ANTHROPIC_API_KEY and other secrets are passed to child processes
  const dotenvVars = loadDotenv();

  writeEnvFile(path.join(ROOT, ".env.local"), { PORT: API_PORT, API_AUTH_TOKEN: DEV_TOKEN });
  writeEnvFile(path.join(ROOT, "apps/control-plane/.env.local"), {
    PORT: UI_PORT,
    NEXT_PUBLIC_BOTOMATIC_API_TOKEN: DEV_TOKEN,
    NEXT_PUBLIC_DEV_BEARER_TOKEN: DEV_TOKEN,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  });

  const apiEnv = {
    ...process.env,
    ...dotenvVars,
    PORT: API_PORT,
    HOST: host,
    API_AUTH_TOKEN: DEV_TOKEN,
    OIDC_ISSUER_URL: "",
    OIDC_CLIENT_ID: "",
    OIDC_AUDIENCE: "",
    AUTH0_CLIENT_SECRET: "",
    PROJECT_REPOSITORY_MODE: "memory",
    QUEUE_BACKEND: "memory",
    RUNTIME_MODE: "development",
    EXECUTOR: "claude",
    CLAUDE_EXECUTOR_URL: "http://localhost:4000",
    CLAUDE_EXECUTOR_KEY: DEV_TOKEN,
    EXTERNAL_CLAUDE_RUNNER: "true",
  };
  const uiEnv = {
    ...process.env,
    ...dotenvVars,
    PORT: UI_PORT,
    HOSTNAME: host,
    NEXT_PUBLIC_BOTOMATIC_API_TOKEN: DEV_TOKEN,
    NEXT_PUBLIC_DEV_BEARER_TOKEN: DEV_TOKEN,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  };

  const executorEnv = {
    ...process.env,
    ...dotenvVars,
    PORT: "4000",
    HOST: host,
    RUNTIME_MODE: "development",
  };

  children = [
    start("api",      tsxCommand(), ["apps/orchestrator-api/src/bootstrap.ts"], apiEnv),
    start("executor", tsxCommand(), ["apps/claude-runner/src/server.ts"],       executorEnv),
    start("ui",       npmCommand(), ["--prefix", "apps/control-plane", "run", "dev", "--", "-H", host, "-p", UI_PORT], uiEnv),
  ];

  console.log("\nBotomatic local launch ready");
  console.log(`- API URL: http://${lanMode && lanIp ? lanIp : "localhost"}:${API_PORT}`);
  console.log(`- UI URL: http://localhost:${UI_PORT}`);
  if (lanMode) console.log(`- Android phone URL: http://${lanIp ?? "<LAN_IP_NOT_FOUND>"}:${UI_PORT}`);
  console.log("- auth mode expected: bearer_token\n");

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
  process.on("exit", () => shutdown(0));
}

if (process.argv[1] && process.argv[1].endsWith("startLocal.ts")) {
  run(process.argv.includes("--lan"));
}
