import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-EvalSuiteReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateEvalSuiteReadiness(root: string): RepoValidatorResult {
  const rel = "release-evidence/runtime/eval_suite_runtime_proof.json";
  const checks = [rel];

  if (!has(root, rel)) {
    return result(false, "Eval suite proof is missing.", checks);
  }

  let payload: any;
  try {
    payload = JSON.parse(read(root, rel));
  } catch {
    return result(false, "Eval suite proof is invalid JSON.", checks);
  }

  const evals = Array.isArray(payload?.evals) ? payload.evals : [];
  const ids = new Set(evals.map((item: any) => String(item?.id || "")));
  const required = ["messy_prompts", "giant_specs", "dirty_repos", "games", "mobile", "bots", "ai_agents", "decide_for_me"];
  const allPresent = required.every((id) => ids.has(id));
  const allPassed = evals.every((item: any) => item?.status === "passed");

  const ok =
    payload?.pathId === "eval_suite_runtime" &&
    payload?.status === "passed" &&
    allPresent &&
    allPassed &&
    typeof payload?.caveat === "string" && payload.caveat.toLowerCase().includes("not claim exhaustive");

  return result(
    ok,
    ok
      ? "Eval suite covers messy prompts, giant specs, dirty repos, games, mobile, bots, AI agents, and decide-for-me paths."
      : "Eval suite coverage is incomplete or contains failing scenarios.",
    checks
  );
}
