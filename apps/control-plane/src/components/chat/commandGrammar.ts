export type CanonicalIntentKind =
  | "intake"
  | "planning"
  | "generated_app_build"
  | "repo_rescue"
  | "validation_proof"
  | "deployment_readiness"
  | "secrets_vault"
  | "self_upgrade"
  | "blocker_resolution"
  | "status_query"
  | "general_chat";

export type CommandClass = {
  intent: CanonicalIntentKind;
  triggers: string[];
  outputs: string[];
};

export const CANONICAL_COMMAND_CLASSES: CommandClass[] = [
  {
    intent: "intake",
    triggers: ["upload", "ingest", "add source", "add github", "add cloud link", "paste spec", "register manifest"],
    outputs: ["intake_context"],
  },
  {
    intent: "planning",
    triggers: ["generate plan", "generate build contract", "approve architecture", "approve build contract", "create milestone graph"],
    outputs: ["build_contract", "milestone_graph"],
  },
  {
    intent: "generated_app_build",
    triggers: [
      "build app",
      "build nexus",
      "build from uploaded spec",
      "generated app",
      "output app",
      "continue build",
      "resume build",
      "start milestone",
      "execute milestone",
      "fix failed milestone",
      "update generated app ui",
    ],
    outputs: ["generated_app_artifacts", "launch_capsule", "proof"],
  },
  {
    intent: "repo_rescue",
    triggers: ["repair repo", "rescue repo", "dirty repo", "complete repo", "analyze repository gaps"],
    outputs: ["repo_completion_contract", "repair_plan", "patched_repo"],
  },
  {
    intent: "validation_proof",
    triggers: ["validate", "validation", "proof", "show proof", "launch readiness", "run validate all"],
    outputs: ["validator_results", "proof_summary"],
  },
  {
    intent: "deployment_readiness",
    triggers: ["deployment readiness", "dry run deploy", "preflight deployment", "credentialed readiness", "prepare deployment"],
    outputs: ["deployment_readiness_report"],
  },
  {
    intent: "secrets_vault",
    triggers: ["secret", "key", "credential", "vault", "rotate", "missing keys"],
    outputs: ["secret_reference_status"],
  },
  {
    intent: "self_upgrade",
    triggers: [
      "self-upgrade",
      "self upgrade",
      "upgrade botomatic",
      "modify botomatic",
      "patch botomatic",
      "fix botomatic builder",
      "change botomatic itself",
    ],
    outputs: ["SelfUpgradeSpec"],
  },
  {
    intent: "blocker_resolution",
    triggers: ["explain blocker", "resolve blocker", "use safe default", "what is blocking", "what now"],
    outputs: ["blocker_analysis", "recommended_action"],
  },
  {
    intent: "status_query",
    triggers: ["status", "where are we", "summary", "next"],
    outputs: ["state_summary", "next_best_action"],
  },
  {
    intent: "general_chat",
    triggers: [],
    outputs: [],
  },
];

export type IntentRouterContext = {
  activeGeneratedAppRun?: boolean;
  uploadedSpecExists?: boolean;
};

export const SELF_UPGRADE_EXPLICIT_PHRASES = [
  "self-upgrade",
  "self upgrade",
  "upgrade botomatic",
  "modify botomatic",
  "patch botomatic",
  "fix botomatic builder",
  "change botomatic itself",
] as const;

export const SELF_UPGRADE_FORBIDDEN_OVERRIDE_PHRASES = [
  "uploaded nexus",
  "nexus v11",
  "canonical build contract",
  "generated_app_build",
  "generated app",
  "output app",
  "build contract",
  "compile project",
  "mastertruth",
  "master truth",
  "milestone graph",
  "execution plan",
  "build nexus",
  "do not enter self-upgrade",
  "classification must be generated_app_build",
] as const;

export const SELF_UPGRADE_NEGATION_PATTERNS = [
  /do\s+not\s+enter\s+self[\s-]upgrade/,
  /do\s+not\s+self[\s-]upgrade/,
  /not\s+a\s+self[\s-]upgrade/,
  /not\s+a\s+botomatic\s+self[\s-]upgrade/,
  /this\s+is\s+not\s+a\s+botomatic\s+self[\s-]upgrade/,
  /\bnot\s+self[\s-]upgrade\b/,
] as const;

export function hasAnyPhrase(input: string, phrases: readonly string[]): boolean {
  const text = input.toLowerCase();
  return phrases.some((phrase) => text.includes(phrase));
}

export function hasAnyPattern(input: string, patterns: readonly RegExp[]): boolean {
  const text = input.toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

export function hasWord(input: string, words: string[]): boolean {
  const text = input.toLowerCase();
  return words.some((word) => text.includes(word));
}
