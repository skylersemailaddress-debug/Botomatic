import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRETS_PATH = path.join(os.homedir(), "Botomatic-local-secrets", "beta-launch.env");
const CHECK_ONLY = process.argv.includes("--check-only");
const LOCAL_URL = "http://localhost:3000";
const PORTS_TO_CLEAR = [3000, 3001, 4000];
const PLACEHOLDER_PATTERNS = [/YOUR_/i, /PASTE_/i, /REPLACE_/i, /changeme/i, /placeholder/i];

function log(message) {
  console.log(`[beta-launch] ${message}`);
}

function fail(message) {
  console.error(`[beta-launch] NO-GO: ${message}`);
  process.exit(1);
}

function parseEnvLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  const exportPrefix = "export ";
  const body = trimmed.startsWith(exportPrefix) ? trimmed.slice(exportPrefix.length).trim() : trimmed;
  const equals = body.indexOf("=");
  if (equals <= 0) fail(`${SECRETS_PATH}:${lineNumber} is not KEY=value format.`);
  const key = body.slice(0, equals).trim();
  let value = body.slice(equals + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) fail(`${SECRETS_PATH}:${lineNumber} has an invalid key: ${key}`);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function readSecrets() {
  if (!fs.existsSync(SECRETS_PATH)) {
    fail(`Missing secrets file at ${SECRETS_PATH}. Create it with Auth0 client credentials and BOTOMATIC_BETA_BASE_URL.`);
  }
  const content = fs.readFileSync(SECRETS_PATH, "utf8");
  const secrets = new Map();
  content.split(/\r?\n/).forEach((line, index) => {
    const parsed = parseEnvLine(line, index + 1);
    if (!parsed) return;
    const [key, value] = parsed;
    if (!value.trim()) fail(`${SECRETS_PATH}:${index + 1} has an empty value for ${key}.`);
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
      fail(`${SECRETS_PATH}:${index + 1} contains a placeholder value for ${key}. Replace it before launching.`);
    }
    secrets.set(key, value);
  });
  return secrets;
}

function pick(secrets, names, required = true) {
  for (const name of names) {
    const value = secrets.get(name) || process.env[name];
    if (value && value.trim()) return value.trim();
  }
  if (!required) return undefined;
  fail(`Missing required setting. Expected one of: ${names.join(", ")}.`);
}

function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function auth0TokenEndpoint(issuerOrDomain) {
  const raw = issuerOrDomain.startsWith("http") ? issuerOrDomain : `https://${issuerOrDomain}`;
  const url = new URL(raw);
  url.pathname = "/oauth/token";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function requestAuth0Token(config) {
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      audience: config.audience,
    }),
  });
  const text = await response.text();
  if (!response.ok) fail(`Auth0 token request failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text);
  const token = String(payload.access_token || "");
  if (!token.startsWith("eyJ")) fail("Auth0 returned an access token that does not look like a JWT.");
  return token;
}

async function preflightRequest({ baseUrl, route, headers = {} }) {
  const started = Date.now();
  const url = `${baseUrl}${route}`;
  const response = await fetch(url, { method: "GET", headers: { Accept: "application/json", ...headers } });
  const text = await response.text();
  const ms = Date.now() - started;
  const ok = response.status >= 200 && response.status < 300;
  const status = ok ? "PASS" : "FAIL";
  log(`${status} GET ${route} HTTP ${response.status} (${ms}ms)`);
  if (!ok) throw new Error(`GET ${url} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
}

async function runPreflight(env) {
  const authHeaders = {
    Authorization: `Bearer ${env.BOTOMATIC_BETA_AUTH_TOKEN}`,
    "x-role": env.BOTOMATIC_BETA_AUTH_ROLE || "admin",
    "x-user-id": env.BOTOMATIC_BETA_USER_ID,
    "x-tenant-id": env.BOTOMATIC_BETA_TENANT_ID,
  };
  await preflightRequest({ baseUrl: env.BOTOMATIC_BETA_BASE_URL, route: "/health" });
  await preflightRequest({ baseUrl: env.BOTOMATIC_BETA_BASE_URL, route: "/ready" });
  await preflightRequest({ baseUrl: env.BOTOMATIC_BETA_BASE_URL, route: "/api/ops/metrics", headers: authHeaders });
  if (env.BOTOMATIC_BETA_PROJECT_ID) {
    const projectId = encodeURIComponent(env.BOTOMATIC_BETA_PROJECT_ID);
    await preflightRequest({ baseUrl: env.BOTOMATIC_BETA_BASE_URL, route: `/api/projects/${projectId}/runtime`, headers: authHeaders });
  }
}

function runCommand(command, args) {
  return spawnSync(command, args, { cwd: ROOT, stdio: "ignore", shell: false });
}

function killPorts() {
  for (const port of PORTS_TO_CLEAR) {
    if (process.platform === "win32") {
      const netstat = spawnSync("cmd.exe", ["/d", "/s", "/c", `for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`], { stdio: "ignore" });
      log(`cleared port ${port} on Windows where possible (status ${netstat.status ?? 0})`);
      continue;
    }
    runCommand("fuser", ["-k", `${port}/tcp`]);
    const lsof = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
    const pids = (lsof.stdout || "").split(/\s+/).filter(Boolean);
    for (const pid of pids) runCommand("kill", ["-9", pid]);
    log(`cleared port ${port} where possible`);
  }
}

function clearNextCache() {
  const nextDir = path.join(ROOT, "apps", "control-plane", ".next");
  fs.rmSync(nextDir, { recursive: true, force: true });
  log("cleared apps/control-plane/.next");
}

function openLocalUrl() {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", LOCAL_URL] : [LOCAL_URL];
  const child = spawn(command, args, { cwd: ROOT, detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
  log(`opened ${LOCAL_URL} where a desktop opener is available`);
}

function startUi(env) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "ui:dev"], { cwd: ROOT, stdio: "inherit", env });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

async function main() {
  const secrets = readSecrets();
  const baseUrl = normalizeBaseUrl(pick(secrets, ["BOTOMATIC_BETA_BASE_URL"]));
  const config = {
    tokenEndpoint: pick(secrets, ["AUTH0_TOKEN_URL", "OIDC_TOKEN_URL"], false) || auth0TokenEndpoint(pick(secrets, ["OIDC_ISSUER_URL", "AUTH0_ISSUER_URL", "AUTH0_DOMAIN"])),
    clientId: pick(secrets, ["OIDC_CLIENT_ID", "AUTH0_CLIENT_ID"]),
    clientSecret: pick(secrets, ["AUTH0_CLIENT_SECRET", "OIDC_CLIENT_SECRET"]),
    audience: pick(secrets, ["OIDC_AUDIENCE", "AUTH0_AUDIENCE"]),
  };

  log(`requesting Auth0 client_credentials token for ${baseUrl}`);
  const token = await requestAuth0Token(config);
  const env = {
    ...process.env,
    BOTOMATIC_BETA_AUTH_TOKEN: token,
    BOTOMATIC_BETA_USER_ID: pick(secrets, ["BOTOMATIC_BETA_USER_ID"], false) || "beta-smoke-admin",
    BOTOMATIC_BETA_TENANT_ID: pick(secrets, ["BOTOMATIC_BETA_TENANT_ID"], false) || "beta-smoke-tenant",
    BOTOMATIC_BETA_BASE_URL: baseUrl,
  };
  const projectId = pick(secrets, ["BOTOMATIC_BETA_PROJECT_ID"], false);
  if (projectId) env.BOTOMATIC_BETA_PROJECT_ID = projectId;
  const authRole = pick(secrets, ["BOTOMATIC_BETA_AUTH_ROLE"], false);
  if (authRole) env.BOTOMATIC_BETA_AUTH_ROLE = authRole;
  env.NEXT_PUBLIC_API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL || baseUrl;
  env.BOTOMATIC_API_BASE_URL = env.BOTOMATIC_API_BASE_URL || baseUrl;
  env.API_BASE_URL = env.API_BASE_URL || baseUrl;

  await runPreflight(env);
  log("GO: beta preflight passed");
  if (CHECK_ONLY) return;

  killPorts();
  clearNextCache();
  openLocalUrl();
  startUi(env);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
