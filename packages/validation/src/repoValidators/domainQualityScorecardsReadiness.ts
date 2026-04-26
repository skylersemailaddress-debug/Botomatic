import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-DomainQualityScorecardsReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateDomainQualityScorecardsReadiness(root: string): RepoValidatorResult {
  const rel = "release-evidence/runtime/domain_quality_scorecards.json";
  const checks = [rel];

  if (!has(root, rel)) {
    return result(false, "Domain quality scorecards proof is missing.", checks);
  }

  let payload: any;
  try {
    payload = JSON.parse(read(root, rel));
  } catch {
    return result(false, "Domain quality scorecards proof is invalid JSON.", checks);
  }

  const rows = Array.isArray(payload?.scorecards) ? payload.scorecards : [];
  const hasRequiredDomains = rows.length >= 8;
  const strictScores = rows.every((row: any) => Number(row?.qualityScoreOutOf10 || 0) >= 9.0 && row?.readinessStatus === "ready");

  const ok =
    payload?.pathId === "domain_quality_scorecards" &&
    payload?.status === "passed" &&
    hasRequiredDomains &&
    strictScores &&
    typeof payload?.caveat === "string" && payload.caveat.toLowerCase().includes("representative");

  return result(
    ok,
    ok
      ? "Per-domain quality scorecards are present with strict readiness scoring and representative caveat."
      : "Per-domain quality scorecards are missing, incomplete, or below strict readiness thresholds.",
    checks
  );
}
