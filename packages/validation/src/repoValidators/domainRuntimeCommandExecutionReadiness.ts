import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const REQUIRED_DOMAINS = [
  "web_saas_app",
  "marketing_website",
  "api_service",
  "mobile_app",
  "bot",
  "ai_agent",
  "game",
  "dirty_repo_completion",
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function resolveEvidencePath(root: string, proofPath: string): string {
  if (fs.existsSync(proofPath)) return proofPath;
  if (proofPath.startsWith("/workspaces/")) {
    const normalized = proofPath.replace(/^\/workspaces\//, "/workspace/");
    if (fs.existsSync(normalized)) return normalized;
  }
  if (proofPath.startsWith("/workspaces/Botomatic/")) {
    const rel = proofPath.replace("/workspaces/Botomatic/", "");
    const joined = path.join(root, rel);
    if (fs.existsSync(joined)) return joined;
  }
  return proofPath;
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-DomainRuntimeCommandExecutionReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateDomainRuntimeCommandExecutionReadiness(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/runtime/domain_runtime_command_execution_proof.json",
    "release-evidence/runtime/logs",
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(
      false,
      "Domain runtime command execution proof or logs are missing. Run npm run -s proof:domain-runtime-commands.",
      checks
    );
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/domain_runtime_command_execution_proof.json"));
  } catch {
    return result(false, "Domain runtime command execution proof JSON is invalid.", checks);
  }

  const domainResults = Array.isArray(proof?.domainResults) ? proof.domainResults : [];
  const hasAllDomains = REQUIRED_DOMAINS.every((id) => domainResults.some((d: any) => d?.domainId === id));

  const domainChecks = REQUIRED_DOMAINS.every((id) => {
    const domain = domainResults.find((d: any) => d?.domainId === id);
    if (!domain) return false;

    if (typeof domain?.emittedPath !== "string" || !domain.emittedPath) return false;
    const emittedPath = resolveEvidencePath(root, domain.emittedPath);
    if (!fs.existsSync(emittedPath)) return false;
    if (typeof domain?.packageProjectManifest !== "string" || !domain.packageProjectManifest) return false;
    if (!fs.existsSync(path.join(emittedPath, domain.packageProjectManifest))) return false;

    const commandResults = Array.isArray(domain?.commandResults) ? domain.commandResults : [];
    if (commandResults.length === 0) return false;

    const hasRequiredDeclarations =
      typeof domain?.installCommand === "string" &&
      typeof domain?.buildCommand === "string" &&
      typeof domain?.testCommand === "string";
    if (!hasRequiredDeclarations) return false;

    for (const cmd of commandResults) {
      if (!cmd?.commandId || !cmd?.kind || !cmd?.command) return false;
      if (!["passed", "failed", "skipped"].includes(String(cmd?.status))) return false;
      if (typeof cmd?.logArtifactPath !== "string" || !cmd.logArtifactPath) return false;
      const logArtifactPath = resolveEvidencePath(root, cmd.logArtifactPath);
      if (!fs.existsSync(logArtifactPath)) return false;
      const logContent = fs.readFileSync(logArtifactPath, "utf8");
      if (String(cmd?.status) !== "skipped" && !logContent.trim()) return false;

      if (String(cmd?.status) === "skipped") {
        const reason = String(cmd?.skipReason || "").trim();
        if (!reason) return false;
      }
    }

    if (domain?.finalRunnableReadinessStatus === "failed") return false;
    if (!["passed", "passed_with_skips"].includes(String(domain?.finalRunnableReadinessStatus || ""))) {
      return false;
    }

    return true;
  });

  const proofOk =
    proof?.pathId === "domain_runtime_command_execution" &&
    proof?.status === "passed" &&
    proof?.requiredDomainPresence === true &&
    Number(proof?.failedDomainCount || 0) === 0;

  const ok = hasAllDomains && domainChecks && proofOk;

  return result(
    ok,
    ok
      ? "Required domain runtime commands are proof-backed with machine-readable logs and fail-closed readiness status."
      : "Domain runtime command execution readiness failed closed (missing domains, malformed logs/proof, or failed runnable status).",
    checks
  );
}
