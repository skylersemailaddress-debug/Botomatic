import fs from "fs";
import path from "path";

import {
  type GeneratedAppCommercialReadinessResult,
  type GeneratedAppReadinessGate,
  validateGeneratedAppCommercialReadiness,
} from "./validateGeneratedAppCommercialReadiness";
import {
  type GeneratedAppNoPlaceholderResult,
  validateGeneratedAppNoPlaceholders,
} from "./validateGeneratedAppNoPlaceholders";

export type GeneratedAppCorpusStatus = "blocked" | "preview_ready" | "candidate_ready";

export type GeneratedAppCorpusCase = {
  id: string;
  displayName: string;
  domain: string;
  appPath: string;
  expectedBlueprintId?: string;
  expectedReadinessStatus?: GeneratedAppCorpusStatus;
  requiredChecks: string[];
  notes: string;
};

export type GeneratedAppCorpusManifest = {
  manifestVersion: string;
  corpusName: string;
  cases: GeneratedAppCorpusCase[];
};

export type GeneratedAppCorpusCaseResult = {
  id: string;
  displayName: string;
  domain: string;
  appPath: string;
  resolvedAppPath: string;
  readinessStatus: GeneratedAppCorpusStatus;
  noPlaceholderSummary: GeneratedAppNoPlaceholderResult;
  commercialReadinessSummary: GeneratedAppCommercialReadinessResult;
  scannedFiles: string[];
  gates: Record<GeneratedAppReadinessGate, { passed: boolean; summary: string }>;
  findings: string[];
  caveats: string[];
  requiredChecks: string[];
  expectedBlueprintId?: string;
  expectedReadinessStatus?: GeneratedAppCorpusStatus;
  notes: string;
};

export type GeneratedAppLaunchPacket = {
  packetVersion: string;
  generatedAt: string;
  caseId: string;
  appPath: string;
  readinessStatus: GeneratedAppCorpusStatus;
  noPlaceholderSummary: GeneratedAppNoPlaceholderResult;
  commercialReadinessSummary: GeneratedAppCommercialReadinessResult;
  scannedFiles: string[];
  gates: Record<GeneratedAppReadinessGate, { passed: boolean; summary: string }>;
  findings: string[];
  caveats: string[];
  recommendedNextActions: string[];
  evidenceBoundary: string;
  claimBoundary: string;
};

export type GeneratedAppCorpusHarnessResult = {
  manifestPath: string;
  manifest: GeneratedAppCorpusManifest;
  validationErrors: string[];
  status: "passed" | "failed";
  caseResults: GeneratedAppCorpusCaseResult[];
  launchPackets: GeneratedAppLaunchPacket[];
  findings: string[];
};

const REQUIRED_LAUNCH_PACKET_CAVEATS = [
  "This launch packet is corpus/static readiness output only and is not live deployment proof.",
  "This launch packet is not runtime execution proof unless future runtime evidence is attached.",
  "Legal/commercial validators must pass separately before any public launch or readiness claim.",
];

function toCorpusStatus(status: string): GeneratedAppCorpusStatus {
  if (status === "candidate_ready" || status === "preview_ready" || status === "blocked") {
    return status;
  }
  return "blocked";
}

export function validateGeneratedAppCorpusManifest(manifest: GeneratedAppCorpusManifest): string[] {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return ["manifest must be an object"];
  }

  if (!manifest.manifestVersion || typeof manifest.manifestVersion !== "string") {
    errors.push("manifest.manifestVersion is required");
  }

  if (!manifest.corpusName || typeof manifest.corpusName !== "string") {
    errors.push("manifest.corpusName is required");
  }

  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    errors.push("manifest.cases must be a non-empty array");
    return errors;
  }

  const seenIds = new Set<string>();
  manifest.cases.forEach((testCase, index) => {
    const prefix = `manifest.cases[${index}]`;
    if (!testCase.id || typeof testCase.id !== "string") {
      errors.push(`${prefix}.id is required`);
    } else if (seenIds.has(testCase.id)) {
      errors.push(`${prefix}.id must be unique`);
    } else {
      seenIds.add(testCase.id);
    }

    if (!testCase.displayName || typeof testCase.displayName !== "string") {
      errors.push(`${prefix}.displayName is required`);
    }
    if (!testCase.domain || typeof testCase.domain !== "string") {
      errors.push(`${prefix}.domain is required`);
    }
    if (!testCase.appPath || typeof testCase.appPath !== "string") {
      errors.push(`${prefix}.appPath is required`);
    }
    if (!Array.isArray(testCase.requiredChecks) || testCase.requiredChecks.length === 0) {
      errors.push(`${prefix}.requiredChecks must be a non-empty array`);
    }
    if (typeof testCase.notes !== "string") {
      errors.push(`${prefix}.notes is required`);
    }
    if (
      testCase.expectedReadinessStatus &&
      !["blocked", "preview_ready", "candidate_ready"].includes(testCase.expectedReadinessStatus)
    ) {
      errors.push(`${prefix}.expectedReadinessStatus must be blocked | preview_ready | candidate_ready when provided`);
    }
  });

  return errors;
}

export function loadGeneratedAppCorpusManifest(manifestPath: string): GeneratedAppCorpusManifest {
  const absoluteManifestPath = path.resolve(manifestPath);
  const source = fs.readFileSync(absoluteManifestPath, "utf8");
  return JSON.parse(source) as GeneratedAppCorpusManifest;
}

export function evaluateGeneratedAppCorpusCase(root: string, testCase: GeneratedAppCorpusCase): GeneratedAppCorpusCaseResult {
  const resolvedAppPath = path.resolve(root, testCase.appPath);

  if (!fs.existsSync(resolvedAppPath)) {
    const message = `Generated app fixture path does not exist: ${resolvedAppPath}`;
    const noPlaceholderSummary: GeneratedAppNoPlaceholderResult = {
      status: "failed",
      scannedFiles: [],
      skippedFiles: [],
      findings: [],
      summary: message,
    };

    const commercialReadinessSummary = validateGeneratedAppCommercialReadiness(resolvedAppPath);

    return {
      id: testCase.id,
      displayName: testCase.displayName,
      domain: testCase.domain,
      appPath: testCase.appPath,
      resolvedAppPath,
      readinessStatus: "blocked",
      noPlaceholderSummary,
      commercialReadinessSummary,
      scannedFiles: [],
      gates: commercialReadinessSummary.gates,
      findings: [message],
      caveats: [...REQUIRED_LAUNCH_PACKET_CAVEATS, ...commercialReadinessSummary.caveats],
      requiredChecks: testCase.requiredChecks,
      expectedBlueprintId: testCase.expectedBlueprintId,
      expectedReadinessStatus: testCase.expectedReadinessStatus,
      notes: testCase.notes,
    };
  }

  const noPlaceholderSummary = validateGeneratedAppNoPlaceholders(resolvedAppPath, {
    includeMarkdown: true,
    rootLabel: testCase.id,
  });

  const commercialReadinessSummary = validateGeneratedAppCommercialReadiness(resolvedAppPath, {
    noPlaceholderOptions: {
      includeMarkdown: true,
      rootLabel: testCase.id,
    },
  });

  const readinessStatus = toCorpusStatus(commercialReadinessSummary.status);
  const findings = commercialReadinessSummary.findings.map((finding) => {
    const suffix = finding.evidence ? ` (${finding.evidence})` : "";
    return `[${finding.gate}] ${finding.message}${suffix}`;
  });

  if (testCase.expectedReadinessStatus && testCase.expectedReadinessStatus !== readinessStatus) {
    findings.push(
      `Expected readiness status mismatch: expected=${testCase.expectedReadinessStatus}, actual=${readinessStatus}.`
    );
  }

  return {
    id: testCase.id,
    displayName: testCase.displayName,
    domain: testCase.domain,
    appPath: testCase.appPath,
    resolvedAppPath,
    readinessStatus,
    noPlaceholderSummary,
    commercialReadinessSummary,
    scannedFiles: commercialReadinessSummary.scannedFiles,
    gates: commercialReadinessSummary.gates,
    findings,
    caveats: [...REQUIRED_LAUNCH_PACKET_CAVEATS, ...commercialReadinessSummary.caveats],
    requiredChecks: testCase.requiredChecks,
    expectedBlueprintId: testCase.expectedBlueprintId,
    expectedReadinessStatus: testCase.expectedReadinessStatus,
    notes: testCase.notes,
  };
}

export function createGeneratedAppLaunchPacket(caseResult: GeneratedAppCorpusCaseResult): GeneratedAppLaunchPacket {
  return {
    packetVersion: "gen-005.v1",
    generatedAt: new Date().toISOString(),
    caseId: caseResult.id,
    appPath: caseResult.appPath,
    readinessStatus: caseResult.readinessStatus,
    noPlaceholderSummary: caseResult.noPlaceholderSummary,
    commercialReadinessSummary: caseResult.commercialReadinessSummary,
    scannedFiles: caseResult.scannedFiles,
    gates: caseResult.gates,
    findings: caseResult.findings,
    caveats: caseResult.caveats,
    recommendedNextActions: [
      ...caseResult.commercialReadinessSummary.recommendedNextActions,
      "Treat this packet as corpus/static signal only; do not use it as live deployment evidence.",
      "Run runtime execution evidence and legal/commercial gates separately before any public readiness statement.",
    ],
    evidenceBoundary:
      "Static corpus-only validator output. No live deployment, runtime execution, or production telemetry evidence is included.",
    claimBoundary:
      "Never interpret blocked/preview_ready/candidate_ready as launch-ready or production-ready claims. Legal/commercial validators must independently pass before public claims.",
  };
}

export function evaluateGeneratedAppCorpus(manifestPath: string): GeneratedAppCorpusHarnessResult {
  const manifest = loadGeneratedAppCorpusManifest(manifestPath);
  const validationErrors = validateGeneratedAppCorpusManifest(manifest);
  const manifestRoot = path.dirname(path.resolve(manifestPath));

  if (validationErrors.length > 0) {
    return {
      manifestPath: path.resolve(manifestPath),
      manifest,
      validationErrors,
      status: "failed",
      caseResults: [],
      launchPackets: [],
      findings: [...validationErrors],
    };
  }

  const caseResults = manifest.cases.map((testCase) => evaluateGeneratedAppCorpusCase(manifestRoot, testCase));
  const launchPackets = caseResults.map((result) => createGeneratedAppLaunchPacket(result));
  const findings = caseResults.flatMap((result) => result.findings.map((finding) => `${result.id}: ${finding}`));
  const hasDisallowedStatus = caseResults.some((result) => /^(launch|production)-?ready$/i.test(String(result.readinessStatus)));

  return {
    manifestPath: path.resolve(manifestPath),
    manifest,
    validationErrors,
    status: hasDisallowedStatus ? "failed" : "passed",
    caseResults,
    launchPackets,
    findings,
  };
}
