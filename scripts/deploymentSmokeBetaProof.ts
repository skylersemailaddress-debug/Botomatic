import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROOF_RELATIVE_PATH = "release-evidence/runtime/deployment_smoke_beta_proof.json";
const DEFAULT_MANIFEST_RELATIVE_PATH = "release-evidence/runtime/beta_environment_manifest.json";
const DOC_RELATIVE_PATH = "docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md";

const REQUIRED_ENV_VARS = ["BOTOMATIC_BETA_BASE_URL", "BOTOMATIC_BETA_AUTH_TOKEN", "BOTOMATIC_BETA_PROJECT_ID"] as const;

type SmokeSignalName =
  | "beta_environment_manifest_present"
  | "health_endpoint_passed"
  | "auth_negative_path_passed"
  | "project_route_smoke_passed"
  | "rollback_documented_or_tested";

type CheckResult = {
  passed: boolean;
  status: "passed" | "failed";
  detail: string;
  method?: string;
  url?: string;
  httpStatus?: number;
  latencyMs?: number;
};

type Proof = {
  generatedAt: string;
  artifact: string;
  pathId: "deployment_smoke_beta";
  status: "passed" | "failed";
  proofMode: "hosted_beta_http_smoke";
  baseUrl: string;
  projectId: string;
  manifestPath: string;
  documentation: string;
  signals: Record<SmokeSignalName, CheckResult>;
  checks: CheckResult[];
};

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value || !value.trim()) return undefined;
  return value.trim();
}

function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function urlFor(baseUrl: string, route: string): string {
  if (/^https?:\/\//i.test(route)) return route;
  return `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, key.toLowerCase() === "authorization" ? "Bearer [REDACTED]" : value]),
  );
}

function pass(detail: string, extra: Partial<CheckResult> = {}): CheckResult {
  return { passed: true, status: "passed", detail, ...extra };
}

function fail(detail: string, extra: Partial<CheckResult> = {}): CheckResult {
  return { passed: false, status: "failed", detail, ...extra };
}

async function requestCheck(input: {
  baseUrl: string;
  route: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  expect: (status: number, body: string) => boolean;
  successDetail: string;
  failureDetail: string;
}): Promise<CheckResult> {
  const method = input.method || "GET";
  const url = urlFor(input.baseUrl, input.route);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(input.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(input.headers || {}),
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    });
    const text = await response.text();
    const latencyMs = Date.now() - started;
    const metadata = { method, url, httpStatus: response.status, latencyMs };
    if (input.expect(response.status, text)) return pass(input.successDetail, metadata);
    return fail(`${input.failureDetail} HTTP ${response.status}: ${text.slice(0, 300)}`, metadata);
  } catch (error) {
    return fail(`${input.failureDetail} ${error instanceof Error ? error.message : String(error)}`, {
      method,
      url,
      latencyMs: Date.now() - started,
    });
  }
}

function verifyRequiredEnv(): { ok: true; baseUrl: string; token: string; projectId: string } | { ok: false; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env(name));
  if (missing.length > 0) return { ok: false, missing };

  const rawBaseUrl = env("BOTOMATIC_BETA_BASE_URL")!;
  try {
    return { ok: true, baseUrl: normalizeBaseUrl(rawBaseUrl), token: env("BOTOMATIC_BETA_AUTH_TOKEN")!, projectId: env("BOTOMATIC_BETA_PROJECT_ID")! };
  } catch (error) {
    console.error(`Invalid BOTOMATIC_BETA_BASE_URL: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, missing: [] };
  }
}

function verifyManifest(manifestRel: string): CheckResult {
  const absolutePath = path.join(ROOT, manifestRel);
  if (!fs.existsSync(absolutePath)) return fail(`Beta environment manifest is missing at ${manifestRel}.`);

  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
    const required = Array.isArray(parsed.requiredEnvVars) ? parsed.requiredEnvVars.map(String) : [];
    const missingFromManifest = REQUIRED_ENV_VARS.filter((name) => !required.includes(name));
    if (missingFromManifest.length > 0) {
      return fail(`Beta environment manifest is missing required env var declarations: ${missingFromManifest.join(", ")}.`);
    }
    return pass(`Beta environment manifest exists and declares required smoke env vars at ${manifestRel}.`);
  } catch (error) {
    return fail(`Beta environment manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function verifyRollbackDocumentation(): CheckResult {
  const docPath = path.join(ROOT, DOC_RELATIVE_PATH);
  const rollbackTested = env("BOTOMATIC_BETA_ROLLBACK_TESTED") === "true";
  if (rollbackTested) return pass("BOTOMATIC_BETA_ROLLBACK_TESTED=true asserts a beta rollback drill was executed outside this smoke script.");
  if (!fs.existsSync(docPath)) return fail(`Rollback documentation is missing at ${DOC_RELATIVE_PATH}.`);

  const doc = fs.readFileSync(docPath, "utf8").toLowerCase();
  const hasRollbackProcedure = doc.includes("rollback procedure") && doc.includes("known-good") && doc.includes("post-rollback smoke");
  if (!hasRollbackProcedure) return fail(`${DOC_RELATIVE_PATH} does not contain the required rollback procedure details.`);
  return pass(`Rollback procedure is documented in ${DOC_RELATIVE_PATH}.`);
}

async function run() {
  const envCheck = verifyRequiredEnv();
  if (!envCheck.ok) {
    const missingMessage = envCheck.missing.length > 0 ? `Missing required env vars: ${envCheck.missing.join(", ")}.` : "Required beta environment configuration is invalid.";
    console.error(`${missingMessage}\nNo passing deployment smoke proof was written. Configure the hosted beta env and rerun npm run proof:deployment-smoke.`);
    process.exit(1);
  }

  const manifestRel = env("BOTOMATIC_BETA_ENVIRONMENT_MANIFEST") || DEFAULT_MANIFEST_RELATIVE_PATH;
  const healthRoute = env("BOTOMATIC_BETA_HEALTH_PATH") || "/api/health";
  const sensitiveRoute = env("BOTOMATIC_BETA_SENSITIVE_PATH") || "/api/ops/metrics";
  const projectRouteTemplate = env("BOTOMATIC_BETA_PROJECT_ROUTE") || "/api/projects/:projectId/status";
  const projectRoute = projectRouteTemplate.replace(/:projectId|\{projectId\}/g, encodeURIComponent(envCheck.projectId));
  const invalidToken = env("BOTOMATIC_BETA_INVALID_AUTH_TOKEN") || "invalid-beta-smoke-token";
  const authHeaders = { Authorization: `Bearer ${envCheck.token}`, "x-role": env("BOTOMATIC_BETA_AUTH_ROLE") || "admin" };
  const invalidAuthHeaders = { Authorization: `Bearer ${invalidToken}` };

  const manifest = verifyManifest(manifestRel);
  const health = await requestCheck({
    baseUrl: envCheck.baseUrl,
    route: healthRoute,
    expect: (status) => status >= 200 && status < 300,
    successDetail: "Health endpoint returned a 2xx response.",
    failureDetail: "Health endpoint did not pass.",
  });
  const authNegative = await requestCheck({
    baseUrl: envCheck.baseUrl,
    route: sensitiveRoute,
    headers: invalidAuthHeaders,
    expect: (status) => status === 401 || status === 403,
    successDetail: "Invalid-auth request to sensitive route was denied.",
    failureDetail: "Invalid-auth request to sensitive route was not denied.",
  });
  const projectSmoke = await requestCheck({
    baseUrl: envCheck.baseUrl,
    route: projectRoute,
    headers: authHeaders,
    expect: (status) => status >= 200 && status < 300,
    successDetail: "Authenticated project route smoke returned a 2xx response.",
    failureDetail: "Authenticated project route smoke failed.",
  });
  const rollback = verifyRollbackDocumentation();

  const signals: Proof["signals"] = {
    beta_environment_manifest_present: manifest,
    health_endpoint_passed: health,
    auth_negative_path_passed: authNegative,
    project_route_smoke_passed: projectSmoke,
    rollback_documented_or_tested: rollback,
  };
  const checks = Object.values(signals);
  const proof: Proof = {
    generatedAt: new Date().toISOString(),
    artifact: PROOF_RELATIVE_PATH,
    pathId: "deployment_smoke_beta",
    status: checks.every((check) => check.passed) ? "passed" : "failed",
    proofMode: "hosted_beta_http_smoke",
    baseUrl: envCheck.baseUrl,
    projectId: envCheck.projectId,
    manifestPath: manifestRel,
    documentation: DOC_RELATIVE_PATH,
    signals,
    checks,
  };

  const outputPath = path.join(ROOT, PROOF_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ event: "deployment_smoke_beta_proof", status: proof.status, artifact: PROOF_RELATIVE_PATH, baseUrl: envCheck.baseUrl, projectId: envCheck.projectId, authHeaders: redactHeaders(authHeaders) }, null, 2));
  if (proof.status !== "passed") process.exit(1);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
