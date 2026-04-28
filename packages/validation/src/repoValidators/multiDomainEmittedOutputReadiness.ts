import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
import { resolveEvidencePath } from "./evidencePath";

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

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-MultiDomainEmittedOutputReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateMultiDomainEmittedOutputReadiness(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/runtime/multi_domain_emitted_output_proof.json",
    "release-evidence/generated-apps",
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(false, "Multi-domain emitted-output evidence is missing. Run npm run -s proof:multi-domain-emitted-output.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/multi_domain_emitted_output_proof.json"));
  } catch {
    return result(false, "Multi-domain emitted-output proof JSON is invalid.", checks);
  }

  const domainResults = Array.isArray(proof?.domainResults) ? proof.domainResults : [];
  const hasAllRequired = REQUIRED_DOMAINS.every((id) => domainResults.some((d: any) => d?.domainId === id));

  const domainChecksOk = REQUIRED_DOMAINS.every((id) => {
    const domain = domainResults.find((d: any) => d?.domainId === id);
    if (!domain) return false;

    const outputRoot = String(domain?.outputRoot || "");
    if (!outputRoot) return false;
    const resolvedOutputRoot = resolveEvidencePath(root, outputRoot);
    if (!fs.existsSync(resolvedOutputRoot)) return false;

    const files = listFilesRecursive(resolvedOutputRoot);
    if (files.length < 6) return false;

    const nonEmpty = files.every((filePath) => fs.readFileSync(filePath, "utf8").trim().length > 0);
    const readinessPath = path.join(resolvedOutputRoot, "domain_readiness.json");
    const scanPath = path.join(resolvedOutputRoot, "no_placeholder_scan.json");
    const launchPath = path.join(resolvedOutputRoot, "launch", "launch_packet.json");
    if (!fs.existsSync(readinessPath) || !fs.existsSync(scanPath) || !fs.existsSync(launchPath)) return false;

    let readiness: any;
    let scan: any;
    try {
      readiness = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
      scan = JSON.parse(fs.readFileSync(scanPath, "utf8"));
    } catch {
      return false;
    }

    return (
      nonEmpty &&
      domain?.readinessStatus === "passed" &&
      domain?.noPlaceholderScanPassed === true &&
      readiness?.readinessStatus === "passed" &&
      readiness?.noPlaceholderScanPassed === true &&
      scan?.ok === true
    );
  });

  const proofOk =
    proof?.pathId === "multi_domain_emitted_output" &&
    proof?.status === "passed" &&
    proof?.domainsPassed === true &&
    proof?.requiredDomainPresence === true &&
    Number(proof?.failedDomainCount || 0) === 0;

  const ok = hasAllRequired && domainChecksOk && proofOk;

  return result(
    ok,
    ok
      ? "Required multi-domain emitted-output trees are present, non-empty, placeholder-clean, and proof-backed."
      : "Multi-domain emitted-output proof failed closed (missing domain tree, invalid metadata, or failed proof artifact).",
    checks
  );
}
