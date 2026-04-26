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
    name: "Validate-Botomatic-FirstRunExperienceReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateFirstRunExperienceReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/overview/FirstRunWhatsNextPanel.tsx",
    "apps/control-plane/src/app/projects/[projectId]/page.tsx",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "First-run experience files are missing.", checks);
  }

  const page = read(root, "apps/control-plane/src/app/projects/[projectId]/page.tsx");
  const panel = read(root, "apps/control-plane/src/components/overview/FirstRunWhatsNextPanel.tsx").toLowerCase();

  const ok =
    page.includes("<FirstRunWhatsNextPanel") &&
    panel.includes("build from idea") &&
    panel.includes("upload spec zip") &&
    panel.includes("upload dirty repo") &&
    panel.includes("configure keys") &&
    panel.includes("launch locally") &&
    panel.includes("prepare deployment") &&
    panel.includes("what's next");

  return result(
    ok,
    ok
      ? "First-run onboarding and What's Next workflow is present with actionable controls."
      : "First-run onboarding and What's Next workflow is incomplete.",
    checks
  );
}
