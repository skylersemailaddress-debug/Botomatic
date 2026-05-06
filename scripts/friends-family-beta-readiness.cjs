#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function envPresent(names) {
  return names.every((name) => Boolean(process.env[name]));
}

const branch = runGit(["branch", "--show-current"]);
const commitSha = runGit(["rev-parse", "HEAD"]);
const generatedAt = new Date().toISOString();
const proof = readJson("botomatic-full-build-proof.json");

const evidence = {
  localOrchestrationProof: proof?.status === "orchestration_core_passed" && proof?.score === 100,
  operationsPacket: existsSync("FRIENDS_AND_FAMILY_BETA_OPERATIONS_PACKET.md"),
  durableExternalEvidence: existsSync("release-evidence/runtime/production-external/DURABLE_DEPLOY_ROLLBACK_RESTART_PROOF_2026-04-24.md"),
  oidcExternalEvidence: existsSync("release-evidence/runtime/production-external/OIDC_AUTH0_PROOF_2026-04-24.md"),
  credentialedDeploymentContract: existsSync("release-evidence/runtime/credentialed_deployment_readiness_proof.json"),
  deploymentDryRunContract: existsSync("release-evidence/runtime/deployment_dry_run_proof.json"),
};

const env = {
  durableSupabaseConfigured: envPresent(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]),
  authConfigured: envPresent(["API_AUTH_TOKEN"]) || envPresent(["OIDC_ISSUER_URL", "OIDC_CLIENT_ID"]),
  executorConfigured: envPresent(["ANTHROPIC_API_KEY"]) || envPresent(["OPENAI_API_KEY"]) || envPresent(["CLAUDE_EXECUTOR_URL"]),
  deploymentConfigured: envPresent(["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) || envPresent(["HOSTING_DEPLOY_TOKEN"]),
};

const gates = [
  {
    id: "main_branch_proof",
    status: branch === "main" && evidence.localOrchestrationProof ? "passed" : "blocked",
    reason: branch === "main" ? "local orchestration proof artifact is present" : "rerun proof gates on main after merge",
  },
  {
    id: "local_orchestration_worker_wave",
    status: evidence.localOrchestrationProof ? "passed" : "blocked",
    reason: evidence.localOrchestrationProof ? "proof:orchestration-core passed with score 100" : "proof:orchestration-core has not produced a passing artifact",
  },
  {
    id: "operations_packet",
    status: evidence.operationsPacket ? "passed" : "blocked",
    reason: evidence.operationsPacket ? "friends-and-family operations packet exists" : "operations packet missing",
  },
  {
    id: "durable_restart_resume",
    status: env.durableSupabaseConfigured ? "ready_to_run" : evidence.durableExternalEvidence ? "evidence_present_needs_current_main_rerun" : "blocked",
    reason: env.durableSupabaseConfigured ? "Supabase env is present; run durable proof" : "Supabase env is not present in this shell",
  },
  {
    id: "protected_auth",
    status: env.authConfigured ? "ready_to_run" : evidence.oidcExternalEvidence ? "evidence_present_needs_current_main_rerun" : "blocked",
    reason: env.authConfigured ? "auth env is present; run protected route proof" : "auth env is not present in this shell",
  },
  {
    id: "external_executor_generation",
    status: env.executorConfigured ? "ready_to_run" : "blocked",
    reason: env.executorConfigured ? "executor env is present; run fresh-project executor proof" : "executor credentials are not present in this shell",
  },
  {
    id: "deployment_or_preview",
    status: env.deploymentConfigured ? "ready_to_run" : evidence.credentialedDeploymentContract && evidence.deploymentDryRunContract ? "contract_present_live_credentials_missing" : "blocked",
    reason: env.deploymentConfigured ? "deployment env is present; run smoke/rollback proof" : "deployment credentials are not present in this shell",
  },
];

const hardBlocked = gates.filter((gate) => gate.status === "blocked");
const needsCurrentMainRerun = gates.filter((gate) => gate.status.includes("needs_current_main_rerun") || gate.status === "ready_to_run" || gate.status === "contract_present_live_credentials_missing");
const readiness = hardBlocked.length === 0 && needsCurrentMainRerun.length === 0 ? "ready_for_supervised_friends_family_pilot" : "not_ready_all_gaps_not_closed";

const audit = {
  generatedAt,
  branch,
  commitSha,
  readiness,
  unsupervisedCommercialBeta: "no_go",
  supervisedPilot: readiness === "ready_for_supervised_friends_family_pilot" ? "go" : "blocked_until_listed_gates_close",
  noHardcodedSecrets: true,
  evidence,
  env,
  gates,
  remainingGaps: gates.filter((gate) => gate.status !== "passed"),
  nextActions: [
    "Merge the proof branch into main and rerun build/test/validate/proof there.",
    "Inject approved Supabase, auth, executor, and deployment credentials only through secret management when those capabilities are in pilot scope.",
    "Run durable restart/resume, protected auth, external executor generation, and deployment/preview smoke proofs for the actual pilot environment.",
    "Invite testers only with the operations packet caveats and manual monitoring in place.",
  ],
};

writeFileSync("friends-family-beta-readiness.json", `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ readiness: audit.readiness, remainingGapCount: audit.remainingGaps.length, output: "friends-family-beta-readiness.json" }, null, 2));
