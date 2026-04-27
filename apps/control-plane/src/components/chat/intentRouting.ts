import {
  hasAnyPhrase,
  hasWord,
  type CanonicalIntentKind,
  type IntentRouterContext,
  SELF_UPGRADE_EXPLICIT_PHRASES,
} from "./commandGrammar";

export type CommandIntent = CanonicalIntentKind;

export function classifyIntent(message: string, context: IntentRouterContext = {}): CommandIntent {
  const text = message.toLowerCase();

  const hasExplicitSelfUpgrade = hasAnyPhrase(text, SELF_UPGRADE_EXPLICIT_PHRASES);
  const hasRepoRescueTerms = /(repair repo|rescue repo|dirty repo|complete repo|repository gaps|repo rescue)/.test(text);
  const hasDeploymentTerms = /(deployment readiness|dry run deploy|preflight deployment|credentialed readiness|prepare deployment|deploy)/.test(text);
  const hasSecretsTerms = /(secret|key|credential|vault|rotate|missing keys|secrets preflight)/.test(text);
  const hasValidationTerms = /(validate|validation|proof|show proof|launch readiness|run validate all)/.test(text);
  const hasBlockerTerms = /(explain blocker|resolve blocker|use safe default|what is blocking|blocked|fix failed milestone)/.test(text);
  const hasGeneratedAppTerms = /(build|continue|resume|go|next|fix|run|make|create|update ui|build nexus|build app|generated app|output app)/.test(text);
  const hasIntakeTerms = /(upload|ingest|add source|add github|add cloud link|paste spec|register manifest|manifest|github|cloud link)/.test(text);
  const hasPlanningTerms = /(generate plan|build contract|approve architecture|approve build contract|milestone graph|plan)/.test(text);
  const hasStatusTerms = /(status|where are we|summary|what now|next)/.test(text);

  if (hasExplicitSelfUpgrade) return "self_upgrade";
  if (hasRepoRescueTerms) return "repo_rescue";
  if (hasDeploymentTerms) return "deployment_readiness";
  if (hasSecretsTerms) return "secrets_vault";
  if (hasValidationTerms) return "validation_proof";
  if (hasBlockerTerms) return "blocker_resolution";
  if (hasGeneratedAppTerms) return "generated_app_build";

  if (context.activeGeneratedAppRun && hasWord(text, ["continue", "resume", "next", "go", "run", "fix"])) {
    return "generated_app_build";
  }

  if (context.uploadedSpecExists && hasWord(text, ["build", "plan", "go", "start", "create", "make", "update"])) {
    return "generated_app_build";
  }

  if (hasIntakeTerms) return "intake";
  if (hasPlanningTerms) return "planning";
  if (hasStatusTerms) return "status_query";
  return "general_chat";
}

export type ParsedCommand =
  | "continue-build"
  | "validate"
  | "explain-blocker"
  | "explain-state"
  | "approve-plan"
  | "show-proof"
  | "fix-failure"
  | "inspect-failure"
  | "resolve-blocker"
  | "next-best-action"
  | "configure-keys"
  | "prepare-deployment"
  | "launch-capsule"
  | "generate-plan"
  | "pause-run"
  | null;

export function parseCommand(message: string): ParsedCommand {
  const normalized = message.trim().toLowerCase();

  if (/^(continue|resume)$/.test(normalized) || /(continue build|resume build|continue run)/.test(normalized)) return "continue-build";
  if (/(^validate$|validate it|run validation|validate now)/.test(normalized)) return "validate";
  if (/(explain blocker|show blocker)/.test(normalized)) return "explain-blocker";
  if (/(explain state|system state|status summary)/.test(normalized)) return "explain-state";
  if (/(approve plan|approve contract)/.test(normalized)) return "approve-plan";
  if (/(show proof|show evidence|show validator)/.test(normalized)) return "show-proof";
  if (/(fix failure|repair failure|fix failed milestone)/.test(normalized)) return "fix-failure";
  if (/(inspect failure|inspect error|inspect failed milestone)/.test(normalized)) return "inspect-failure";
  if (/(resolve blocker|unblock)/.test(normalized)) return "resolve-blocker";
  if (/(next best action|what next|next action|what now)/.test(normalized)) return "next-best-action";
  if (/(configure keys|missing secrets|show missing secrets|configure missing keys)/.test(normalized)) return "configure-keys";
  if (/(prepare deployment|deployment readiness|preflight deployment)/.test(normalized)) return "prepare-deployment";
  if (/(launch capsule|generate launch capsule|review launch package)/.test(normalized)) return "launch-capsule";
  if (/(generate plan|^plan$|create plan)/.test(normalized)) return "generate-plan";
  if (/(pause run|stop run|halt run)/.test(normalized)) return "pause-run";

  return null;
}

export function mapIntentToPath(intent: CommandIntent): "intake" | "planning" | "execution" | "validation" {
  if (intent === "deployment_readiness" || intent === "validation_proof" || intent === "secrets_vault") {
    return "validation";
  }
  if (intent === "planning") {
    return "planning";
  }
  if (intent === "generated_app_build" || intent === "repo_rescue" || intent === "self_upgrade" || intent === "intake") {
    return "intake";
  }
  if (intent === "blocker_resolution" || intent === "status_query" || intent === "general_chat") {
    return "execution";
  }
  return "intake";
}

export function extractFirstUrl(message: string): string | null {
  const match = message.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

export function isGithubUrl(url: string): boolean {
  return /https?:\/\/(www\.)?github\.com\//i.test(url);
}

export function isCloudLink(url: string): boolean {
  return /(drive\.google\.com|dropbox\.com|onedrive\.live\.com|sharepoint\.com|box\.com|s3\.|storage\.googleapis\.com)/i.test(url);
}

export function maybeLocalManifest(message: string): Record<string, unknown> | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.sourceType === "string" || typeof parsed.path === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function shouldIngestAsPastedSpec(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 240) {
    return false;
  }
  return /\n/.test(trimmed) || /(requirements|acceptance criteria|architecture|milestone|deliverable)/i.test(trimmed);
}
