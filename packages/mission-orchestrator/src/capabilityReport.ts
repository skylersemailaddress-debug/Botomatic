/**
 * Capability honesty module.
 *
 * Documents exactly what Botomatic produces, what validation gates verify,
 * and what additional work is required before any app can be considered
 * launch-ready or production-grade.
 */

export interface CapabilityBoundary {
  name: string;
  canDo: string[];
  cannotDo: string[];
  requiresHumanReview: string[];
  validationMeaning: string;
}

export interface CapabilityReport {
  systemName: string;
  version: string;
  generatedAt: string;
  boundaries: CapabilityBoundary[];
  claimBoundarySemantics: Record<string, string>;
  oneLiner: string;
  launchReadinessGap: string[];
}

export const CAPABILITY_BOUNDARIES: CapabilityBoundary[] = [
  {
    name: "Code Generation",
    canDo: [
      "Generate a runnable Node.js workspace scaffold (6 core files)",
      "Produce a valid package.json with build/test/start scripts",
      "Generate a working HTTP server with /health endpoint",
      "Produce a React component stub from spec text",
      "Run node --check (syntax validation) and confirm the script parses",
      "Spawn the server, wait for TCP readiness, probe /health — real smoke",
    ],
    cannotDo: [
      "Generate full business logic (auth, payments, database access) without human review",
      "Produce a complete Next.js or React app with real routing, data fetching, and state",
      "Write database migrations for a specific schema without review",
      "Configure real OAuth, Stripe, SendGrid, or other external providers",
      "Deploy to production — dry-run only without live credentials",
    ],
    requiresHumanReview: [
      "Auth provider configuration and secrets",
      "Payment processor integration and webhook handling",
      "Database schema review before running migrations",
      "Compliance and legal requirements (GDPR, HIPAA, PCI)",
      "Security audit of generated code before production exposure",
    ],
    validationMeaning:
      "PASS_REAL means: workspace created, server.mjs parsed, server started on a real port, /health returned 200. It does NOT mean the app implements your spec's business logic.",
  },
  {
    name: "Commercial Readiness Gates",
    canDo: [
      "Scan all generated files for 21 forbidden placeholder tokens (TODO, mock, fake auth, etc.)",
      "Verify package.json contains build and test scripts",
      "Verify an entrypoint (app/page.tsx or src/main.ts) exists",
      "Check README for required keywords: deploy, security, accessibility, responsive",
      "Enforce legal claim boundary: no launch-ready claim without evidence",
      "Report candidate_ready, preview_ready, or blocked — never launch_ready",
    ],
    cannotDo: [
      "Prove the app is correct, complete, or production-safe",
      "Replace a human security audit",
      "Validate business logic correctness",
      "Verify real payment flows, email delivery, or auth federation",
    ],
    requiresHumanReview: [
      "candidate_ready does not mean launch-ready",
      "All 15 gates passing is a necessary but not sufficient condition for shipping",
      "Runtime validation (build/run/smoke) required before any launch claim",
      "Deployment smoke validation required before any live-deploy claim",
    ],
    validationMeaning:
      "candidate_ready means: no forbidden tokens found, required structural keywords present, legal caveats in place. It does NOT mean the app is ready to ship.",
  },
  {
    name: "Mission Wave Execution",
    canDo: [
      "Compile any spec text into a structured wave plan with acceptance criteria",
      "Validate wave dependency graph (topological sort, cycle detection)",
      "Track proven/pending/failed wave status with checkpoint persistence",
      "Compute claim boundary level (MISSION_COMPILED through SYSTEM_LAUNCH_READY)",
      "Execute waves via builder API with real build/run/smoke status capture",
      "Resume interrupted missions from last checkpoint",
    ],
    cannotDo: [
      "Guarantee wave execution produces spec-correct business logic",
      "Auto-approve high-risk decisions (auth, payments, compliance)",
      "Execute waves without an API server running (except dry-run mode)",
      "Skip human approval for locked mission contracts",
    ],
    requiresHumanReview: [
      "MissionContract review before execution (userApproved required)",
      "High-risk field decisions (auth, payments, database, security) require explicit approval",
      "SYSTEM_LAUNCH_READY claim requires all waves proven + human sign-off",
    ],
    validationMeaning:
      "SYSTEM_LAUNCH_READY means: all waves proven, all build/run/smoke checks passed. Human sign-off and deployment smoke validation still required before shipping.",
  },
  {
    name: "Spec-Lock Enforcement",
    canDo: [
      "Block high-risk assumptions (auth, payments, security) from auto-approval",
      "Preserve security/compliance openQuestions through the intake flow",
      "Require explicit MissionContract approval before builder execution",
      "Gate build on resolved high-risk questions",
      "Report build_blocked with full spec/assumptions/questions payload",
    ],
    cannotDo: [
      "Answer spec questions — only flags them as unresolved",
      "Auto-resolve compliance or legal questions",
      "Approve high-risk decisions on behalf of the user",
    ],
    requiresHumanReview: [
      "All questions with risk=high must be explicitly resolved",
      "Auth provider, payment processor, and data retention decisions",
      "Deployment target and secrets strategy",
    ],
    validationMeaning:
      "build_blocked means: one or more high-risk spec questions are unresolved. The system refuses to generate code until these are answered.",
  },
];

export const CLAIM_BOUNDARY_SEMANTICS: Record<string, string> = {
  MISSION_COMPILED:
    "Spec compiled into wave plan with acceptance criteria. No code generated yet.",
  WAVE_READY:
    "At least one wave is ready to execute (all its dependencies are proven).",
  WAVE_PROVEN:
    "At least one wave has been executed and passed build/run/smoke checks.",
  SYSTEM_PARTIAL:
    "Core scaffolding wave (repo_layout) proven. Foundation exists but system is incomplete.",
  SYSTEM_BUILDABLE:
    "Core infrastructure waves proven (repo, API schema, builder). System can build but may not run correctly.",
  SYSTEM_RUNTIME_PROVEN:
    "All non-terminal waves proven. System builds, runs, passes smoke. Deployment and end-to-end proof pending.",
  SYSTEM_LAUNCH_READY:
    "All waves proven including end-to-end proof. Maximum automated evidence collected. Human sign-off still required.",
};

export function generateCapabilityReport(): CapabilityReport {
  return {
    systemName: "Botomatic",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    boundaries: CAPABILITY_BOUNDARIES,
    claimBoundarySemantics: CLAIM_BOUNDARY_SEMANTICS,
    oneLiner:
      "Botomatic is a spec-driven mission orchestrator that compiles enterprise specs into structured wave plans, executes them via a builder API, validates output against commercial readiness gates, and enforces spec-lock before any build. It generates runnable scaffolds and proof-of-concept apps — not full production implementations.",
    launchReadinessGap: [
      "Generated apps require human engineering review before shipping",
      "Auth, payments, and external integrations require real credentials and manual configuration",
      "Security audit required — generated code is not audited by default",
      "Compliance requirements (GDPR, HIPAA, PCI) require human legal review",
      "Load testing and capacity planning not performed by the mission system",
      "Deployment smoke validation in a staging environment required",
      "candidate_ready is a gate, not a launch permit",
    ],
  };
}

export function formatCapabilityReport(report: CapabilityReport): string {
  const lines: string[] = [
    `# ${report.systemName} Capability Report`,
    `Generated: ${report.generatedAt}`,
    "",
    `## What This System Is`,
    report.oneLiner,
    "",
    `## Claim Boundary Semantics`,
    ...Object.entries(report.claimBoundarySemantics).map(([k, v]) => `  **${k}**: ${v}`),
    "",
    `## Capability Boundaries`,
  ];

  for (const b of report.boundaries) {
    lines.push(`\n### ${b.name}`);
    lines.push(`**Can do:**`);
    b.canDo.forEach((x) => lines.push(`  - ${x}`));
    lines.push(`**Cannot do:**`);
    b.cannotDo.forEach((x) => lines.push(`  - ${x}`));
    lines.push(`**Requires human review:**`);
    b.requiresHumanReview.forEach((x) => lines.push(`  - ${x}`));
    lines.push(`**Validation means:** ${b.validationMeaning}`);
  }

  lines.push("", `## Launch Readiness Gap`);
  lines.push("These gaps remain after SYSTEM_LAUNCH_READY is claimed:");
  report.launchReadinessGap.forEach((x) => lines.push(`  - ${x}`));

  return lines.join("\n");
}
