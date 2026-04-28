import fs from "fs";
import path from "path";

import {
  type GeneratedAppNoPlaceholderOptions,
  type GeneratedAppNoPlaceholderResult,
  validateGeneratedAppNoPlaceholders,
} from "./validateGeneratedAppNoPlaceholders";

export type GeneratedAppReadinessStatus = "blocked" | "preview_ready" | "candidate_ready";

export type GeneratedAppReadinessGate =
  | "file_structure"
  | "installability_manifest"
  | "build_script_presence"
  | "test_script_presence"
  | "no_placeholder_scan"
  | "route_or_entrypoint_presence"
  | "data_model_or_storage_plan"
  | "auth_boundary_plan"
  | "integration_boundary_plan"
  | "accessibility_notes"
  | "responsive_ui_notes"
  | "error_empty_loading_states"
  | "security_notes"
  | "deployment_plan"
  | "legal_claim_boundary";

export type GeneratedAppCommercialReadinessFinding = {
  gate: GeneratedAppReadinessGate;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  evidence?: string;
};

export type GeneratedAppCommercialReadinessOptions = {
  noPlaceholderOptions?: GeneratedAppNoPlaceholderOptions;
  productionRelevantExtensions?: string[];
};

export type GeneratedAppCommercialReadinessResult = {
  status: GeneratedAppReadinessStatus;
  gates: Record<GeneratedAppReadinessGate, { passed: boolean; summary: string }>;
  findings: GeneratedAppCommercialReadinessFinding[];
  noPlaceholderSummary: GeneratedAppNoPlaceholderResult;
  scannedFiles: string[];
  caveats: string[];
  summary: string;
  recommendedNextActions: string[];
};

type GateRecord = Record<GeneratedAppReadinessGate, { passed: boolean; summary: string }>;

const DEFAULT_PRODUCTION_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".sql", ".html", ".css", ".scss", ".yml", ".yaml",
];

const REQUIRED_CAVEATS = [
  "Commercial readiness status is not launch-readiness proof.",
  "Runtime validation evidence is required before any launch-readiness claim.",
  "Deployment smoke validation is required before any launch-readiness claim.",
  "Legal claim boundary evidence is required before any launch-readiness claim.",
];

function toUnix(p: string): string {
  return p.split(path.sep).join("/");
}

function collectFiles(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        if (["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(entry)) continue;
        stack.push(path.join(current, entry));
      }
      continue;
    }
    out.push(toUnix(path.relative(root, current)));
  }
  return out.sort();
}

function makeGateRecord(): GateRecord {
  return {
    file_structure: { passed: false, summary: "Pending" },
    installability_manifest: { passed: false, summary: "Pending" },
    build_script_presence: { passed: false, summary: "Pending" },
    test_script_presence: { passed: false, summary: "Pending" },
    no_placeholder_scan: { passed: false, summary: "Pending" },
    route_or_entrypoint_presence: { passed: false, summary: "Pending" },
    data_model_or_storage_plan: { passed: false, summary: "Pending" },
    auth_boundary_plan: { passed: false, summary: "Pending" },
    integration_boundary_plan: { passed: false, summary: "Pending" },
    accessibility_notes: { passed: false, summary: "Pending" },
    responsive_ui_notes: { passed: false, summary: "Pending" },
    error_empty_loading_states: { passed: false, summary: "Pending" },
    security_notes: { passed: false, summary: "Pending" },
    deployment_plan: { passed: false, summary: "Pending" },
    legal_claim_boundary: { passed: false, summary: "Pending" },
  };
}

function hasAny(files: string[], patterns: RegExp[]): string | undefined {
  return files.find((file) => patterns.some((pattern) => pattern.test(file)));
}

function readIfExists(root: string, relPath: string): string {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return "";
  try {
    return fs.readFileSync(full, "utf8");
  } catch {
    return "";
  }
}

function evaluateNotes(files: string[], root: string, gate: GeneratedAppReadinessGate, keywords: string[]): { passed: boolean; summary: string; evidence?: string } {
  const mdFiles = files.filter((file) => file.toLowerCase().endsWith(".md") || file.toLowerCase().endsWith(".txt"));
  for (const file of mdFiles) {
    const text = readIfExists(root, file).toLowerCase();
    const matches = keywords.every((word) => text.includes(word));
    if (matches) {
      return { passed: true, summary: `${gate} documented in ${file}.`, evidence: file };
    }
  }

  return {
    passed: false,
    summary: `${gate} notes are missing. Expected keywords: ${keywords.join(", ")}.`,
  };
}

export function validateGeneratedAppCommercialReadiness(
  appPath: string,
  options: GeneratedAppCommercialReadinessOptions = {}
): GeneratedAppCommercialReadinessResult {
  const gates = makeGateRecord();
  const findings: GeneratedAppCommercialReadinessFinding[] = [];
  const productionRelevantExtensions = new Set(options.productionRelevantExtensions ?? DEFAULT_PRODUCTION_EXTENSIONS);

  if (!appPath || !fs.existsSync(appPath)) {
    const missingSummary: GeneratedAppNoPlaceholderResult = {
      status: "failed",
      scannedFiles: [],
      skippedFiles: [],
      findings: [],
      summary: `Generated app path does not exist: ${appPath || "<empty>"}`,
    };

    findings.push({ gate: "file_structure", severity: "critical", message: missingSummary.summary });
    gates.file_structure = { passed: false, summary: missingSummary.summary };

    return {
      status: "blocked",
      gates,
      findings,
      noPlaceholderSummary: missingSummary,
      scannedFiles: [],
      caveats: REQUIRED_CAVEATS,
      summary: "blocked: generated app path is missing.",
      recommendedNextActions: ["Provide a valid generated app path before running commercial readiness evaluation."],
    };
  }

  const root = path.resolve(appPath);
  const files = collectFiles(root);
  const productionRelevantFiles = files.filter((file) => productionRelevantExtensions.has(path.extname(file).toLowerCase()) || /(^|\/)package\.json$/.test(file));

  gates.file_structure = {
    passed: productionRelevantFiles.length > 0,
    summary: productionRelevantFiles.length > 0
      ? `Found ${productionRelevantFiles.length} production-relevant files.`
      : "No production-relevant files were detected.",
  };

  if (!gates.file_structure.passed) {
    findings.push({ gate: "file_structure", severity: "critical", message: gates.file_structure.summary });
  }

  const packageJsonRel = hasAny(files, [/^package\.json$/, /^app\/package\.json$/, /^src\/package\.json$/]);
  let packageJson: any = null;
  if (packageJsonRel) {
    try {
      packageJson = JSON.parse(readIfExists(root, packageJsonRel));
    } catch {
      packageJson = null;
    }
  }

  gates.installability_manifest = {
    passed: Boolean(packageJsonRel),
    summary: packageJsonRel ? `Installability manifest found at ${packageJsonRel}.` : "No package manifest found.",
  };

  if (!gates.installability_manifest.passed) {
    findings.push({ gate: "installability_manifest", severity: "critical", message: gates.installability_manifest.summary });
  }

  const scripts = packageJson?.scripts || {};
  const buildScript = typeof scripts.build === "string" && scripts.build.trim().length > 0;
  const testScript = typeof scripts.test === "string" && scripts.test.trim().length > 0;

  const runbookDocs = files.filter((file) => /readme|runbook|launch|deploy/i.test(file) && /\.md$/i.test(file));
  const docsText = runbookDocs.map((file) => readIfExists(root, file).toLowerCase()).join("\n");
  const documentedBuild = docsText.includes("npm run build") || docsText.includes("pnpm build") || docsText.includes("yarn build") || docsText.includes("build:");
  const documentedTest = docsText.includes("npm test") || docsText.includes("pnpm test") || docsText.includes("yarn test") || docsText.includes("test:");

  gates.build_script_presence = {
    passed: buildScript || documentedBuild,
    summary: buildScript
      ? "Build script exists in package manifest."
      : documentedBuild
      ? "Build command documented in generated app notes."
      : "Build script/command evidence is missing.",
  };
  if (!gates.build_script_presence.passed) {
    findings.push({ gate: "build_script_presence", severity: "medium", message: gates.build_script_presence.summary });
  }

  gates.test_script_presence = {
    passed: testScript || documentedTest,
    summary: testScript
      ? "Test script exists in package manifest."
      : documentedTest
      ? "Test command documented in generated app notes."
      : "Test script/command evidence is missing.",
  };
  if (!gates.test_script_presence.passed) {
    findings.push({ gate: "test_script_presence", severity: "medium", message: gates.test_script_presence.summary });
  }

  const noPlaceholderSummary = validateGeneratedAppNoPlaceholders(root, {
    includeMarkdown: true,
    rootLabel: path.basename(root),
    ...(options.noPlaceholderOptions || {}),
  });

  const criticalOrHighPlaceholderFindings = noPlaceholderSummary.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high");
  gates.no_placeholder_scan = {
    passed: criticalOrHighPlaceholderFindings.length === 0,
    summary: criticalOrHighPlaceholderFindings.length === 0
      ? "No critical/high placeholder findings detected."
      : `Detected ${criticalOrHighPlaceholderFindings.length} critical/high placeholder findings.`,
  };
  if (!gates.no_placeholder_scan.passed) {
    findings.push({
      gate: "no_placeholder_scan",
      severity: "critical",
      message: gates.no_placeholder_scan.summary,
      evidence: criticalOrHighPlaceholderFindings[0] ? `${criticalOrHighPlaceholderFindings[0].filePath}:${criticalOrHighPlaceholderFindings[0].line}` : undefined,
    });
  }

  const routeOrEntrypoint = hasAny(files, [
    /^app\/(page|layout)\.(ts|tsx|js|jsx)$/,
    /^src\/(main|index)\.(ts|tsx|js|jsx)$/,
    /^index\.(ts|tsx|js|jsx)$/,
    /^app\/api\/.+\/route\.(ts|tsx|js|jsx)$/,
    /^pages\/.+\.(ts|tsx|js|jsx)$/,
  ]);
  gates.route_or_entrypoint_presence = {
    passed: Boolean(routeOrEntrypoint),
    summary: routeOrEntrypoint ? `Route/entrypoint found at ${routeOrEntrypoint}.` : "No route or executable entrypoint detected.",
  };
  if (!gates.route_or_entrypoint_presence.passed) {
    findings.push({ gate: "route_or_entrypoint_presence", severity: "critical", message: gates.route_or_entrypoint_presence.summary });
  }

  const dataModel = evaluateNotes(files, root, "data_model_or_storage_plan", ["data", "model"]);
  gates.data_model_or_storage_plan = { passed: dataModel.passed, summary: dataModel.summary };
  if (!dataModel.passed) findings.push({ gate: "data_model_or_storage_plan", severity: "medium", message: dataModel.summary });

  const authBoundary = evaluateNotes(files, root, "auth_boundary_plan", ["auth", "boundary"]);
  gates.auth_boundary_plan = { passed: authBoundary.passed, summary: authBoundary.summary };
  if (!authBoundary.passed) findings.push({ gate: "auth_boundary_plan", severity: "medium", message: authBoundary.summary });

  const integrationBoundary = evaluateNotes(files, root, "integration_boundary_plan", ["integration", "boundary"]);
  gates.integration_boundary_plan = { passed: integrationBoundary.passed, summary: integrationBoundary.summary };
  if (!integrationBoundary.passed) findings.push({ gate: "integration_boundary_plan", severity: "medium", message: integrationBoundary.summary });

  const accessibility = evaluateNotes(files, root, "accessibility_notes", ["accessibility"]);
  gates.accessibility_notes = { passed: accessibility.passed, summary: accessibility.summary };
  if (!accessibility.passed) findings.push({ gate: "accessibility_notes", severity: "low", message: accessibility.summary });

  const responsive = evaluateNotes(files, root, "responsive_ui_notes", ["responsive"]);
  gates.responsive_ui_notes = { passed: responsive.passed, summary: responsive.summary };
  if (!responsive.passed) findings.push({ gate: "responsive_ui_notes", severity: "low", message: responsive.summary });

  const uxStates = evaluateNotes(files, root, "error_empty_loading_states", ["error", "empty", "loading"]);
  gates.error_empty_loading_states = { passed: uxStates.passed, summary: uxStates.summary };
  if (!uxStates.passed) findings.push({ gate: "error_empty_loading_states", severity: "medium", message: uxStates.summary });

  const security = evaluateNotes(files, root, "security_notes", ["security"]);
  gates.security_notes = { passed: security.passed, summary: security.summary };
  if (!security.passed) findings.push({ gate: "security_notes", severity: "medium", message: security.summary });

  const deployment = evaluateNotes(files, root, "deployment_plan", ["deploy"]);
  gates.deployment_plan = { passed: deployment.passed, summary: deployment.summary };
  if (!deployment.passed) findings.push({ gate: "deployment_plan", severity: "medium", message: deployment.summary });

  const legal = evaluateNotes(files, root, "legal_claim_boundary", ["not launch-ready", "legal"]);
  gates.legal_claim_boundary = { passed: legal.passed, summary: legal.summary };
  if (!legal.passed) findings.push({ gate: "legal_claim_boundary", severity: "critical", message: legal.summary });

  const hasHardBlockedCondition =
    !gates.file_structure.passed ||
    !gates.installability_manifest.passed ||
    !gates.route_or_entrypoint_presence.passed ||
    !gates.legal_claim_boundary.passed ||
    !gates.no_placeholder_scan.passed;

  const candidateGatesPass =
    gates.no_placeholder_scan.passed &&
    gates.installability_manifest.passed &&
    gates.build_script_presence.passed &&
    gates.test_script_presence.passed &&
    gates.route_or_entrypoint_presence.passed &&
    gates.deployment_plan.passed &&
    gates.legal_claim_boundary.passed &&
    gates.security_notes.passed &&
    gates.error_empty_loading_states.passed;

  let status: GeneratedAppReadinessStatus = "preview_ready";
  if (hasHardBlockedCondition) {
    status = "blocked";
  } else if (candidateGatesPass) {
    status = "candidate_ready";
  }

  const recommendedNextActions = [
    !gates.build_script_presence.passed ? "Add or document a deterministic build command." : "",
    !gates.test_script_presence.passed ? "Add or document a deterministic test command." : "",
    !gates.deployment_plan.passed ? "Document deployment and smoke-test steps in generated app docs." : "",
    !gates.security_notes.passed ? "Document security boundaries and threat assumptions." : "",
    !gates.legal_claim_boundary.passed ? "Add legal claim boundary caveats that explicitly avoid launch-readiness claims." : "",
    status === "candidate_ready" ? "Run runtime validators and deployment smoke checks before any launch-readiness statement." : "",
  ].filter(Boolean);

  return {
    status,
    gates,
    findings,
    noPlaceholderSummary,
    scannedFiles: Array.from(new Set([...files, ...noPlaceholderSummary.scannedFiles])).sort(),
    caveats: REQUIRED_CAVEATS,
    summary: `${status}: ${findings.length} findings across ${Object.keys(gates).length} gates.`,
    recommendedNextActions,
  };
}
