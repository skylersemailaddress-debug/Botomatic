import crypto from "crypto";
import fs from "fs";
import path from "path";
import { summarizeRuntimeSuite, RuntimeSuiteResult } from "./types";

type Role = "operator" | "reviewer" | "admin";

type RuntimeEnv = {
  baseUrl: string;
  issuer: string;
  audience: string;
  privateKeyPem: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

function toBase64Url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function buildJwt(role: Role, env: RuntimeEnv, subject: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: "botomatic-local-kid" };
  const payload = {
    iss: env.issuer,
    sub: subject,
    aud: env.audience,
    iat: now,
    exp: now + 3600,
    role,
  };

  const encoded = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(encoded);
  signer.end();
  const sig = signer.sign(env.privateKeyPem).toString("base64url");
  return `${encoded}.${sig}`;
}

async function requestJson(url: string, opts: RequestInit): Promise<{ status: number; body: any; requestId: string | null }> {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, requestId: res.headers.get("x-request-id") };
}

async function runOpsObservabilitySuite(env: RuntimeEnv): Promise<RuntimeSuiteResult> {
  const operatorToken = buildJwt("operator", env, "ops-operator");
  const reviewerToken = buildJwt("reviewer", env, "ops-reviewer");

  const checks: RuntimeSuiteResult["checks"] = [];

  const intake = await requestJson(`${env.baseUrl}/api/projects/intake`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Observability Runtime Validation",
      request: "Validate ops telemetry endpoints",
    }),
  });

  if (intake.status !== 200 || !intake.body?.projectId) {
    checks.push({
      name: "bootstrap_project",
      status: "failed",
      details: `intake failed: status=${intake.status}`,
    });
    return { suite: "OpsObservability", checks };
  }

  const metrics = await requestJson(`${env.baseUrl}/api/ops/metrics`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
      "x-request-id": "ops-metrics-proof",
    },
  });
  checks.push({
    name: "ops_metrics_endpoint_live",
    status: metrics.status === 200 && typeof metrics.body?.routeErrorCount === "number" ? "passed" : "failed",
    details: `expected 200 with metrics shape, got status=${metrics.status}`,
  });

  const queue = await requestJson(`${env.baseUrl}/api/ops/queue`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
    },
  });
  checks.push({
    name: "ops_queue_endpoint_live",
    status: queue.status === 200 && typeof queue.body?.queueDepth === "number" ? "passed" : "failed",
    details: `expected 200 with queueDepth, got status=${queue.status}`,
  });

  const errors = await requestJson(`${env.baseUrl}/api/ops/errors`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
    },
  });
  checks.push({
    name: "ops_errors_endpoint_live",
    status: errors.status === 200 && Array.isArray(errors.body?.errors) ? "passed" : "failed",
    details: `expected 200 with errors array, got status=${errors.status}`,
  });

  checks.push({
    name: "request_id_header_present",
    status: metrics.requestId ? "passed" : "failed",
    details: metrics.requestId ? `x-request-id=${metrics.requestId}` : "x-request-id header missing on /api/ops/metrics",
  });

  return { suite: "OpsObservability", checks };
}

async function run() {
  const enabled = process.env.BOTOMATIC_OBSERVABILITY_VALIDATE === "1";
  if (!enabled) {
    console.log("Observability validation skipped (set BOTOMATIC_OBSERVABILITY_VALIDATE=1 to enable)");
    return;
  }

  const env: RuntimeEnv = {
    baseUrl: requiredEnv("BOTOMATIC_BASE_URL"),
    issuer: requiredEnv("BOTOMATIC_OIDC_ISSUER"),
    audience: requiredEnv("BOTOMATIC_OIDC_AUDIENCE"),
    privateKeyPem: fs.readFileSync(requiredEnv("BOTOMATIC_OIDC_PRIVATE_KEY_PATH"), "utf8"),
  };

  const suite = await runOpsObservabilitySuite(env);
  const summary = summarizeRuntimeSuite(suite);
  const payload = {
    generatedAt: new Date().toISOString(),
    proofGrade: "local_runtime",
    suite,
    summary,
  };

  const outDir = path.join(process.cwd(), "release-evidence", "runtime");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "ops_observability.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`Observability validation written: ${outPath}`);
  console.log(`passed=${summary.passed} failed=${summary.failed} skipped=${summary.skipped}`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(String((error as any)?.message || error));
  process.exit(1);
});
