import crypto from "crypto";
import { RuntimeSuiteResult } from "./types";

type Role = "operator" | "reviewer" | "admin";

type RuntimeEnv = {
  baseUrl: string;
  issuer: string;
  audience: string;
  privateKeyPem: string;
};

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

async function requestJson(url: string, opts: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

export async function runGateNegativePathSuite(env: RuntimeEnv): Promise<RuntimeSuiteResult> {
  const operatorToken = buildJwt("operator", env, "validation-operator");
  const reviewerToken = buildJwt("reviewer", env, "validation-reviewer");
  const adminToken = buildJwt("admin", env, "validation-admin");

  const checks: RuntimeSuiteResult["checks"] = [];

  const intake = await requestJson(`${env.baseUrl}/api/projects/intake`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Validation Negative Path Project",
      request: "Need governed execution with strict role boundaries",
    }),
  });

  if (intake.status !== 200 || !intake.body?.projectId) {
    checks.push({
      name: "bootstrap_project",
      status: "failed",
      details: `intake failed: status=${intake.status}`,
    });
    return { suite: "GateNegativePaths", checks };
  }

  const projectId = intake.body.projectId as string;

  await requestJson(`${env.baseUrl}/api/projects/${projectId}/compile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
  });

  await requestJson(`${env.baseUrl}/api/projects/${projectId}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
  });

  const operatorDenied = await requestJson(`${env.baseUrl}/api/projects/${projectId}/dispatch/execute-next`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
  });
  checks.push({
    name: "unauthorized_dispatch_denied",
    status: operatorDenied.status === 403 ? "passed" : "failed",
    details: `expected 403, got ${operatorDenied.status}`,
  });

  const governanceBlocked = await requestJson(`${env.baseUrl}/api/projects/${projectId}/deploy/promote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ environment: "staging" }),
  });
  checks.push({
    name: "blocked_governance_promote",
    status: governanceBlocked.status === 409 && String(governanceBlocked.body?.error || "").includes("governance") ? "passed" : "failed",
    details: `expected governance 409, got ${governanceBlocked.status}`,
  });

  const replayBlocked = await requestJson(`${env.baseUrl}/api/projects/${projectId}/repair/replay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  });
  checks.push({
    name: "replay_restricted_before_approval",
    status: replayBlocked.status === 409 ? "passed" : "failed",
    details: `expected replay 409, got ${replayBlocked.status}`,
  });

  const reviewerDeniedAdminRoute = await requestJson(`${env.baseUrl}/api/projects/${projectId}/governance/approval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runtimeProofStatus: "captured", approvalStatus: "approved" }),
  });
  checks.push({
    name: "reviewer_denied_admin_route",
    status: reviewerDeniedAdminRoute.status === 403 ? "passed" : "failed",
    details: `expected 403, got ${reviewerDeniedAdminRoute.status}`,
  });

  const govApproved = await requestJson(`${env.baseUrl}/api/projects/${projectId}/governance/approval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runtimeProofStatus: "captured", approvalStatus: "approved" }),
  });
  checks.push({
    name: "admin_governance_approval",
    status: govApproved.status === 200 ? "passed" : "failed",
    details: `expected 200, got ${govApproved.status}`,
  });

  const promoteBlockedGate = await requestJson(`${env.baseUrl}/api/projects/${projectId}/deploy/promote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ environment: "staging" }),
  });
  checks.push({
    name: "blocked_promote_before_ready",
    status: promoteBlockedGate.status === 409 && String(promoteBlockedGate.body?.error || "").includes("gate not ready") ? "passed" : "failed",
    details: `expected gate-not-ready 409, got ${promoteBlockedGate.status}`,
  });

  const rollbackBlocked = await requestJson(`${env.baseUrl}/api/projects/${projectId}/deploy/rollback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ environment: "staging" }),
  });
  checks.push({
    name: "rollback_requires_promoted_state",
    status: rollbackBlocked.status === 409 ? "passed" : "failed",
    details: `expected 409, got ${rollbackBlocked.status}`,
  });

  const audit = await requestJson(`${env.baseUrl}/api/projects/${projectId}/ui/audit`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
    },
  });
  const hasGovEvent = Array.isArray(audit.body?.events)
    && audit.body.events.some((evt: any) => evt?.type === "governance_approval_updated");
  checks.push({
    name: "audit_contains_governance_event",
    status: audit.status === 200 && hasGovEvent ? "passed" : "failed",
    details: `expected governance event in audit, status=${audit.status}`,
  });

  return { suite: "GateNegativePaths", checks };
}
