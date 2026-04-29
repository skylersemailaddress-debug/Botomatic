import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const REQUIRED_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "foundation vs max-power distinction", pattern: /release-candidate foundation[\s\S]*not[\s\S]*max-power/i },
  { label: "chat-first control law", pattern: /chat-first control law|chat-first/i },
  { label: "no visible mode-toggle workflow", pattern: /no visible[\s\S]*mode-toggle|no visible[\s\S]*toggle/i },
  { label: "vibe screenshot truth", pattern: /vibe[\s\S]*sidebar[\s\S]*chat timeline[\s\S]*build map[\s\S]*one-click launch/i },
  { label: "pro screenshot truth", pattern: /pro[\s\S]*project[\s\S]*branch[\s\S]*environment[\s\S]*build pipeline[\s\S]*terminal/i },
  { label: "live visual UI builder truth", pattern: /live visual ui builder truth|live visual ui builder/i },
  { label: "every visible UI element editable by chat command", pattern: /every visible ui element[\s\S]*editable by chat command/i },
  { label: "real-time preview update wording", pattern: /preview[\s\S]*update[\s\S]*live[\s\S]*real time/i },
  { label: "actual generated UI model not fake static mock wording", pattern: /actual generated ui model[\s\S]*not[\s\S]*fake static mock/i },
  { label: "sync back to generated source files wording", pattern: /sync back[\s\S]*generated source files/i },
  { label: "selection/inspect mode wording", pattern: /selection\/inspect mode|selection and inspect mode/i },
  { label: "natural reference resolver wording", pattern: /resolve natural references[\s\S]*this[\s\S]*that card[\s\S]*the hero[\s\S]*booking form/i },
  { label: "undo/redo and diff preview wording", pattern: /undo\/redo[\s\S]*diff preview/i },
  { label: "voice-as-speech-to-chat wording", pattern: /voice[\s\S]*speech-to-chat input/i },
  { label: "build contract before execution", pattern: /build contract[\s\S]*required before execution/i },
  { label: "risk-tier autonomy policy", pattern: /low-risk[\s\S]*medium-risk[\s\S]*high-risk/i },
  { label: "no-placeholder/fake-path requirements", pattern: /no placeholder[\s\S]*fake integration path/i },
  { label: "domain coverage target", pattern: /websites[\s\S]*saas\/web apps[\s\S]*mobile apps[\s\S]*ai apps\/agents[\s\S]*dirty repo repair[\s\S]*roblox-style games[\s\S]*steam\/desktop games[\s\S]*complex enterprise apps/i },
  { label: "claim boundary not proven 99%", pattern: /99%[\s\S]*(aspiration|not|until independently proven)/i },
  { label: "claim boundary not all production-ready", pattern: /not launch-ready without validation|not production-ready/i },
  { label: "claim boundary not live deployment claim", pattern: /does not claim live deployment is proven|live deployment requires credentials/i },
  { label: "claim boundary not zero leaks proven", pattern: /does not claim zero leaks are proven|not a zero leaks proven claim/i },
  { label: "future audits compare against spec", pattern: /future max-power audits[\s\S]*compare[\s\S]*MASTER_TRUTH_SPEC\.md/i },
];

const FORBIDDEN_PATTERNS = [
  /proven 99%/i,
  /builds 99% of all software/i,
  /all generated apps are production-ready/i,
  /live deployed/i,
  /zero leaks proven/i,
  /guaranteed enterprise app output/i,
];

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

export function validateMasterTruthSpecReadiness(root: string): RepoValidatorResult {
  const checks = ["MASTER_TRUTH_SPEC.md", "README.md", "docs/final-release-evidence-lock.md", "ISSUE_STACK.md"];
  if (!has(root, "MASTER_TRUTH_SPEC.md")) {
    return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "failed", summary: "MASTER_TRUTH_SPEC.md is missing.", checks };
  }

  const spec = read(root, "MASTER_TRUTH_SPEC.md");
  for (const required of REQUIRED_PATTERNS) {
    if (!required.pattern.test(spec)) {
      return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "failed", summary: `MASTER_TRUTH_SPEC.md missing required section: ${required.label}.`, checks };
    }
  }

  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (forbidden.test(spec)) {
      return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "failed", summary: "MASTER_TRUTH_SPEC.md contains unbounded claim language.", checks };
    }
  }

  const readme = has(root, "README.md") ? read(root, "README.md") : "";
  if (!/MASTER_TRUTH_SPEC\.md/.test(readme)) {
    return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "failed", summary: "README.md must point to MASTER_TRUTH_SPEC.md.", checks };
  }

  const boundarySource = (has(root, "docs/final-release-evidence-lock.md") ? read(root, "docs/final-release-evidence-lock.md") : "") + "\n" + (has(root, "ISSUE_STACK.md") ? read(root, "ISSUE_STACK.md") : "");
  if (!/release-candidate foundation[\s\S]*(does not assert|not)[\s\S]*max-power/i.test(boundarySource)) {
    return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "failed", summary: "Foundation-vs-max-power distinction must be preserved in docs/final-release-evidence-lock.md or ISSUE_STACK.md.", checks };
  }

  return { name: "Validate-Botomatic-MasterTruthSpecReadiness", status: "passed", summary: "Canonical master truth spec and boundary safeguards are present.", checks };
}
