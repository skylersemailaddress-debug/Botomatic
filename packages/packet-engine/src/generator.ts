import { MasterTruth } from "../../core-contracts/src/masterTruth";
import { Packet } from "../../core-contracts/src/packet";

export type Milestone = {
  id: string;
  title: string;
  sequence: number;
};

// ── Resource artifact categories (N82) ───────────────────────────────────────
// Used to declare read/write dependencies so the orchestrator can schedule
// independent packets in parallel and detect write-write conflicts.
const ART = {
  MONOREPO:    "monorepo_scaffold",
  SCHEMA:      "data_schema",
  MIGRATIONS:  "db_migrations",
  TYPES:       "type_definitions",
  AUTH:        "auth_layer",
  API_ROUTES:  "api_routes",
  FRONTEND:    "frontend_shell",
  PAGES:       "ui_pages",
  BUILD_PIPE:  "build_pipeline",
  SECURITY:    "security_layer",
  DEPLOY:      "deploy_config",
  TESTS:       "test_suite",
  QUEUE:       "execution_queue",
  REPAIR:      "repair_engine",
  MEMORY:      "memory_store",
  SPEC:        "spec_compiler",
} as const;

// ── Dependency graph (N92 topological sort) ───────────────────────────────────
// Each goal key maps to: { reads, writes, deps (goal keys it depends on) }
// Goals with overlapping deps can run in parallel waves.
const GOAL_GRAPH: Record<string, {
  reads:  string[];
  writes: string[];
  deps:   string[];  // goal keys that must complete first
  risk:   "low" | "medium" | "high";
}> = {
  // Wave 0 — root (no deps)
  product_truth:     { reads: [],                               writes: [ART.SPEC],        deps: [],                                      risk: "low"    },
  workspace:         { reads: [],                               writes: [ART.MONOREPO],    deps: [],                                      risk: "low"    },

  // Wave 1 — needs monorepo (runs in parallel)
  schema:            { reads: [ART.MONOREPO],                   writes: [ART.SCHEMA, ART.MIGRATIONS, ART.TYPES], deps: ["workspace"],     risk: "high"   },
  build_pipeline:    { reads: [ART.MONOREPO],                   writes: [ART.BUILD_PIPE],  deps: ["workspace"],                           risk: "low"    },

  // Wave 2 — needs schema (runs in parallel)
  auth:              { reads: [ART.SCHEMA, ART.TYPES],          writes: [ART.AUTH],        deps: ["schema"],                              risk: "high"   },
  execution_queue:   { reads: [ART.SCHEMA, ART.TYPES],          writes: [ART.QUEUE],       deps: ["schema"],                              risk: "medium" },

  // Wave 3 — needs auth + schema (some run in parallel)
  api_routes:        { reads: [ART.AUTH, ART.SCHEMA, ART.TYPES],writes: [ART.API_ROUTES],  deps: ["auth", "schema"],                      risk: "high"   },
  security:          { reads: [ART.AUTH, ART.MIGRATIONS],       writes: [ART.SECURITY],    deps: ["auth"],                                risk: "high"   },
  frontend_shell:    { reads: [ART.AUTH, ART.TYPES],            writes: [ART.FRONTEND],    deps: ["auth"],                                risk: "medium" },
  repair_engine:     { reads: [ART.QUEUE],                      writes: [ART.REPAIR],      deps: ["execution_queue"],                     risk: "medium" },
  memory_store:      { reads: [ART.QUEUE],                      writes: [ART.MEMORY],      deps: ["execution_queue"],                     risk: "medium" },
  deploy_config:     { reads: [ART.BUILD_PIPE],                 writes: [ART.DEPLOY],      deps: ["build_pipeline"],                      risk: "medium" },

  // Wave 4 — needs api_routes + frontend (some in parallel)
  pages:             { reads: [ART.API_ROUTES, ART.AUTH],       writes: [ART.PAGES],       deps: ["api_routes", "frontend_shell"],        risk: "medium" },
  integrations:      { reads: [ART.API_ROUTES, ART.AUTH],       writes: [ART.API_ROUTES],  deps: ["api_routes"],                          risk: "medium" },
  admin_tools:       { reads: [ART.AUTH, ART.API_ROUTES],       writes: [ART.PAGES],       deps: ["api_routes"],                          risk: "medium" },
  workflow_logic:    { reads: [ART.API_ROUTES, ART.AUTH],       writes: [ART.API_ROUTES],  deps: ["api_routes"],                          risk: "high"   },
  payments:          { reads: [ART.AUTH, ART.API_ROUTES],       writes: [ART.API_ROUTES],  deps: ["api_routes"],                          risk: "high"   },
  notifications:     { reads: [ART.AUTH, ART.API_ROUTES],       writes: [ART.API_ROUTES],  deps: ["api_routes"],                          risk: "medium" },
  forms:             { reads: [ART.PAGES, ART.API_ROUTES],      writes: [ART.PAGES],       deps: ["pages"],                               risk: "low"    },
  ui_states:         { reads: [ART.PAGES],                      writes: [ART.PAGES],       deps: ["pages"],                               risk: "low"    },
  responsive_ui:     { reads: [ART.PAGES],                      writes: [ART.PAGES],       deps: ["pages"],                               risk: "low"    },

  // Wave 5 — validation (runs last)
  tests:             { reads: [ART.API_ROUTES, ART.AUTH, ART.PAGES], writes: [ART.TESTS], deps: ["api_routes", "pages"],                 risk: "medium" },
  readme:            { reads: [ART.DEPLOY, ART.API_ROUTES],     writes: [],                deps: ["deploy_config"],                       risk: "low"    },
  launch_packet:     { reads: [ART.TESTS, ART.DEPLOY],          writes: [],                deps: ["tests"],                               risk: "low"    },
  validation_proof:  { reads: [ART.TESTS, ART.SECURITY],        writes: [],                deps: ["tests", "security"],                   risk: "low"    },
};

function requestRequiresPayments(truth: MasterTruth): boolean {
  const text = `${truth.coreValue} ${truth.category} ${(truth.features || []).join(" ")}`.toLowerCase();
  return /(payment|billing|checkout|subscription|invoice|refund|tax|payout|dispute)/i.test(text);
}

function requestRequiresNotifications(truth: MasterTruth): boolean {
  const text = `${truth.coreValue} ${truth.category} ${(truth.features || []).join(" ")}`.toLowerCase();
  return /(notification|notify|alert|email|sms|reminder|message|ticket)/i.test(text);
}

function createMilestones(projectId: string): Milestone[] {
  return [
    { id: `${projectId}-m1`, title: "Scaffold + Repo Setup",   sequence: 1 },
    { id: `${projectId}-m2`, title: "Auth + App Shell",        sequence: 2 },
    { id: `${projectId}-m3`, title: "Core Data Model",         sequence: 3 },
    { id: `${projectId}-m4`, title: "Core Workflow Pages",     sequence: 4 },
    { id: `${projectId}-m5`, title: "Validation + Preview",    sequence: 5 },
  ];
}

function makePacketId(projectId: string, goalKey: string): string {
  return `${projectId}_${goalKey.replace(/[^a-z0-9]/gi, "_")}`;
}

function appendUniquePacket(packets: Packet[], packet: Packet): void {
  const goal = packet.goal.trim().toLowerCase();
  const exists = packets.some((p) => p.goal.trim().toLowerCase() === goal);
  if (!exists) packets.push(packet);
}

export function generatePlan(truth: MasterTruth): {
  milestones: Milestone[];
  packets: Packet[];
} {
  const milestones = createMilestones(truth.projectId);
  const now = new Date().toISOString();
  const packets: Packet[] = [];

  // Map from goal key → packetId for dependency resolution
  const packetIdByKey: Record<string, string> = {};

  // Foundation goal list with graph-derived deps + resource declarations
  const foundations: Array<{
    key: string;
    goal: string;
    milestoneIdx: number;
  }> = [
    { key: "product_truth",   goal: "Define product truth and build contract",                   milestoneIdx: 0 },
    { key: "workspace",       goal: "Set architecture baseline and workspace setup",              milestoneIdx: 0 },
    { key: "schema",          goal: "Design database schema and entity relationships",            milestoneIdx: 2 },
    { key: "schema",          goal: "Create and validate database migrations",                    milestoneIdx: 2 },
    { key: "auth",            goal: "Implement authentication and RBAC enforcement",              milestoneIdx: 1 },
    { key: "build_pipeline",  goal: "Implement build pipeline and CI configuration",             milestoneIdx: 0 },
    { key: "api_routes",      goal: "Implement API routes for core workflows",                   milestoneIdx: 3 },
    { key: "frontend_shell",  goal: "Implement frontend pages and navigation",                   milestoneIdx: 3 },
    { key: "forms",           goal: "Implement forms with validation and handlers",              milestoneIdx: 3 },
    { key: "workflow_logic",  goal: "Implement workflow orchestration logic",                    milestoneIdx: 3 },
    { key: "admin_tools",     goal: "Implement admin tools and governance controls",             milestoneIdx: 3 },
    { key: "integrations",    goal: "Implement required third-party integrations",               milestoneIdx: 3 },
    { key: "ui_states",       goal: "Implement loading, empty, and error UI states",             milestoneIdx: 3 },
    { key: "responsive_ui",   goal: "Implement responsive UI requirements",                      milestoneIdx: 3 },
    { key: "security",        goal: "Implement security hardening and auditability",             milestoneIdx: 4 },
    { key: "tests",           goal: "Add automated tests for critical workflows",                milestoneIdx: 4 },
    { key: "deploy_config",   goal: "Create deployment configuration and environment manifest",  milestoneIdx: 4 },
    { key: "readme",          goal: "Write README and operations runbook",                       milestoneIdx: 4 },
    { key: "launch_packet",   goal: "Produce launch packet and readiness summary",               milestoneIdx: 4 },
    { key: "validation_proof",goal: "Capture final validation proof artifact",                   milestoneIdx: 4 },
  ];

  if (requestRequiresPayments(truth)) {
    foundations.push({ key: "payments",      goal: "Implement payments flow and billing controls",    milestoneIdx: 3 });
  }
  if (requestRequiresNotifications(truth)) {
    foundations.push({ key: "notifications", goal: "Implement notifications and delivery workflow",   milestoneIdx: 3 });
  }

  // Build packetId registry first (needed for dependency resolution)
  const seenGoals = new Set<string>();
  foundations.forEach(({ key, goal }) => {
    const goalNorm = goal.trim().toLowerCase();
    if (!seenGoals.has(goalNorm)) {
      seenGoals.add(goalNorm);
      const pid = makePacketId(truth.projectId, key + "_" + goalNorm.slice(0, 20));
      packetIdByKey[key] = packetIdByKey[key] ?? pid; // first wins (most foundational)
    }
  });

  seenGoals.clear();
  foundations.forEach(({ key, goal, milestoneIdx }) => {
    const goalNorm = goal.trim().toLowerCase();
    if (seenGoals.has(goalNorm)) return;
    seenGoals.add(goalNorm);

    const graphEntry = GOAL_GRAPH[key] ?? { reads: [], writes: [], deps: [], risk: "low" as const };
    const depPacketIds = graphEntry.deps
      .map(d => packetIdByKey[d])
      .filter(Boolean);

    const milestone = milestones[milestoneIdx] ?? milestones[0];
    const pid = packetIdByKey[key] ?? makePacketId(truth.projectId, key);

    appendUniquePacket(packets, {
      packetId:           pid,
      projectId:          truth.projectId,
      milestoneId:        milestone.id,
      goal,
      branchName:         `build/${truth.projectId}/${milestone.sequence}-${key}`,
      filesToTouch:       [],
      requirements:       [goal],
      acceptanceCriteria: ["Build completes", "CI passes"],
      validationCommands: ["npm run build"],
      constraints:        ["Do not exceed packet scope"],
      executorTarget:     "claude",
      dependencies:       depPacketIds,
      reads:              graphEntry.reads,
      writes:             graphEntry.writes,
      blocks:             [],
      retryCount:         0,
      maxRetries:         graphEntry.risk === "high" ? 1 : 2, // N94: high-risk maxAttempts=1
      riskLevel:          graphEntry.risk,
      status:             "pending",
      createdAt:          now,
      updatedAt:          now,
    });
  });

  // Canonical spec-driven packets (pages, workflows, entities)
  const canonicalPages     = Array.isArray((truth as any)?.canonicalSpec?.pages)     ? ((truth as any).canonicalSpec.pages as string[])     : [];
  const canonicalWorkflows = Array.isArray((truth as any)?.canonicalSpec?.workflows)  ? ((truth as any).canonicalSpec.workflows as string[])  : [];
  const canonicalDataModel = Array.isArray((truth as any)?.canonicalSpec?.dataModel)  ? ((truth as any).canonicalSpec.dataModel as string[])  : [];

  const apiRoutesPacketId = packetIdByKey["api_routes"];
  const pagesPacketId     = packetIdByKey["frontend_shell"];
  const schemaPacketId    = packetIdByKey["schema"];

  canonicalPages.slice(0, 6).forEach((page, idx) => {
    appendUniquePacket(packets, {
      packetId: makePacketId(truth.projectId, `page_${idx}`), projectId: truth.projectId,
      milestoneId: milestones[3].id, goal: `Implement page: ${page}`,
      branchName: `build/${truth.projectId}/4-page-${idx}`, filesToTouch: [],
      requirements: [`Page: ${page}`], acceptanceCriteria: ["Build completes", "CI passes"],
      validationCommands: ["npm run build"], constraints: ["Do not exceed packet scope"],
      executorTarget: "claude",
      dependencies: [pagesPacketId, apiRoutesPacketId].filter(Boolean) as string[],
      reads: [ART.FRONTEND, ART.API_ROUTES], writes: [ART.PAGES], blocks: [],
      retryCount: 0, maxRetries: 2, riskLevel: "low", status: "pending", createdAt: now, updatedAt: now,
    });
  });

  canonicalWorkflows.slice(0, 6).forEach((workflow, idx) => {
    appendUniquePacket(packets, {
      packetId: makePacketId(truth.projectId, `workflow_${idx}`), projectId: truth.projectId,
      milestoneId: milestones[4].id, goal: `Implement workflow: ${workflow}`,
      branchName: `build/${truth.projectId}/5-workflow-${idx}`, filesToTouch: [],
      requirements: [`Workflow: ${workflow}`], acceptanceCriteria: ["Build completes", "CI passes"],
      validationCommands: ["npm run build"], constraints: ["Do not exceed packet scope"],
      executorTarget: "claude",
      dependencies: [apiRoutesPacketId].filter(Boolean) as string[],
      reads: [ART.API_ROUTES, ART.AUTH], writes: [ART.PAGES], blocks: [],
      retryCount: 0, maxRetries: 2, riskLevel: "medium", status: "pending", createdAt: now, updatedAt: now,
    });
  });

  canonicalDataModel.slice(0, 6).forEach((entity, idx) => {
    appendUniquePacket(packets, {
      packetId: makePacketId(truth.projectId, `entity_${idx}`), projectId: truth.projectId,
      milestoneId: milestones[2].id, goal: `Implement data entity: ${entity}`,
      branchName: `build/${truth.projectId}/3-entity-${idx}`, filesToTouch: [],
      requirements: [`Entity: ${entity}`], acceptanceCriteria: ["Build completes", "CI passes"],
      validationCommands: ["npm run build"], constraints: ["Do not exceed packet scope"],
      executorTarget: "claude",
      dependencies: [schemaPacketId].filter(Boolean) as string[],
      reads: [ART.SCHEMA, ART.TYPES], writes: [ART.SCHEMA], blocks: [],
      retryCount: 0, maxRetries: 2, riskLevel: "low", status: "pending", createdAt: now, updatedAt: now,
    });
  });

  return { milestones, packets };
}
