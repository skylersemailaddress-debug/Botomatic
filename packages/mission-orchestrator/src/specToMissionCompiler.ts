import crypto from "crypto";
import {
  Mission,
  MissionWave,
  MissionPacket,
} from "./missionModel.js";
import { detectTargetArchitecture, detectProductType } from "./missionTargets.js";
import type { MissionTargetType } from "./missionTargets.js";

export interface CompilerInput {
  specText: string;
  sourceFile: string;
  projectId: string;
}

export interface CompilerOutput {
  mission: Mission;
  sourceHash: string;
  specHash: string;
  waveCount: number;
  productType: string;
  targetArchitecture: MissionTargetType;
}

interface WaveDef {
  id: string;
  name: string;
  description: string;
  dependsOn: string[];
  scope: string[];
  validators: string[];
  evidence: string[];
  acceptance: string[];
  packets: Array<{ goal: string; scope: string[]; risk: "low" | "medium" | "high" }>;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function deriveTitle(specText: string, sourceFile: string): string {
  const firstLine = specText.split("\n").find((l) => l.trim().length > 4)?.trim();
  if (firstLine && firstLine.length < 120) return firstLine;
  return `Mission from ${sourceFile}`;
}

function detectWaveHints(specText: string): Set<string> {
  const lower = specText.toLowerCase();
  const present = new Set<string>();
  const signals: Array<[string, string]> = [
    ["repo_layout", "repo layout|monorepo|workspace|directory structure|scaffold"],
    ["api_schema", "api contract|data schema|database|entity|migration|prisma|orm"],
    ["spec_compiler", "spec compiler|deterministic app spec|das|ibc|build contract"],
    ["execution_runtime", "execution runtime|worker|job queue|packet|dag|orchestrat"],
    ["builder_factory", "builder engine|factory|code gen|blueprint|generate app"],
    ["repair_replay", "repair engine|replay|dirty repo|rollback|patch"],
    ["truth_memory", "truth engine|memory engine|belief|fact|continuity"],
    ["intelligence_shell", "intelligence shell|command spine|operational focus|prediction"],
    ["governance_security", "governance|security|rbac|tenant|approval|permission"],
    ["deployment_rollback", "deployment|rollback|live deploy|export|vercel|cloud"],
    ["validation_proof", "validation|proof|validator|evidence|claim boundary"],
    ["fresh_clone_proof", "fresh clone|end-to-end proof|system launch|launch ready"],
  ];
  for (const [id, pattern] of signals) {
    if (new RegExp(pattern).test(lower)) present.add(id);
  }
  return present;
}

function buildWaveCatalog(hints: Set<string>): WaveDef[] {
  const catalog: WaveDef[] = [
    {
      id: "repo_layout",
      name: "Repo Layout + Scaffold",
      description: "Generate monorepo structure, workspace config, tsconfig, shared types, and dev tooling.",
      dependsOn: [],
      scope: ["package.json", "tsconfig.json", "packages/", "apps/", "scripts/"],
      validators: ["validate:spec-contract", "validate:repo-structure"],
      evidence: ["repo-structure-proof", "build-pass"],
      acceptance: ["monorepo builds", "workspaces resolve", "tsconfig compiles"],
      packets: [
        { goal: "Scaffold monorepo with packages/, apps/, and root config", scope: ["package.json", "tsconfig.json"], risk: "low" },
        { goal: "Define shared type contracts in packages/core-contracts/", scope: ["packages/core-contracts/"], risk: "low" },
        { goal: "Verify clean build from fresh clone", scope: ["*"], risk: "low" },
      ],
    },
    {
      id: "api_schema",
      name: "API + Data Schema",
      description: "Define all API route contracts, data model schemas, and database migrations.",
      dependsOn: ["repo_layout"],
      scope: ["packages/core-contracts/", "schema/", "migrations/"],
      validators: ["validate:api-contracts", "validate:data-model"],
      evidence: ["schema-proof", "migration-proof"],
      acceptance: ["all entities defined", "migrations apply cleanly", "no schema gaps"],
      packets: [
        { goal: "Define canonical data model entities and relationships", scope: ["packages/core-contracts/src/"], risk: "low" },
        { goal: "Generate database migration files for all entities", scope: ["migrations/"], risk: "medium" },
        { goal: "Define all API route contracts with request/response/auth/error", scope: ["packages/core-contracts/src/apiRoutes.ts"], risk: "low" },
      ],
    },
    {
      id: "spec_compiler",
      name: "DAS / IBC Spec Compiler",
      description: "Build the deterministic app spec compiler that converts raw input into DAS and IBC.",
      dependsOn: ["repo_layout", "api_schema"],
      scope: ["packages/spec-engine/", "packages/core-contracts/"],
      validators: ["validate:spec-contract", "validate:spec-completeness"],
      evidence: ["spec-compiler-proof", "same-input-same-hash"],
      acceptance: ["same input → same specHash", "missing roles → blocked decision", "low-risk gap → assumption recorded"],
      packets: [
        { goal: "Implement spec extraction and normalization pipeline", scope: ["packages/spec-engine/src/specAnalyzer.ts"], risk: "medium" },
        { goal: "Implement assumption ledger and blocked decision engine", scope: ["packages/spec-engine/src/assumptionLedger.ts"], risk: "low" },
        { goal: "Implement specHash determinism — same input produces same hash", scope: ["packages/spec-engine/src/"], risk: "high" },
        { goal: "Implement Immutable Build Contract generator", scope: ["packages/spec-engine/src/buildContract.ts"], risk: "medium" },
      ],
    },
    {
      id: "execution_runtime",
      name: "Execution DAG + Runtime",
      description: "Build the job queue, worker system, packet execution, lease, and retry infrastructure.",
      dependsOn: ["repo_layout", "api_schema"],
      scope: ["packages/execution/", "packages/packet-engine/", "packages/supabase-adapter/"],
      validators: ["validate:execution-runtime", "validate:job-idempotency"],
      evidence: ["execution-proof", "idempotency-proof"],
      acceptance: ["no double execution", "idempotent jobs", "lease expiry retries correctly"],
      packets: [
        { goal: "Implement job queue with claim, lease, and retry semantics", scope: ["packages/supabase-adapter/src/jobClient.ts"], risk: "medium" },
        { goal: "Implement packet worker with execution and status reporting", scope: ["packages/execution/"], risk: "medium" },
        { goal: "Implement execution DAG — topological packet ordering", scope: ["packages/packet-engine/src/"], risk: "high" },
      ],
    },
    {
      id: "builder_factory",
      name: "Builder / Factory Engine",
      description: "Build the code synthesis engine that turns packets + blueprints into real working applications.",
      dependsOn: ["repo_layout", "api_schema", "spec_compiler", "execution_runtime"],
      scope: ["packages/blueprints/", "packages/domain-builders/", "apps/orchestrator-api/src/"],
      validators: ["validate:builder-output", "validate:no-placeholders"],
      evidence: ["builder-proof", "smoke-proof", "no-placeholder-proof"],
      acceptance: ["generated app builds", "generated app runs", "/health returns ok", "no placeholder code"],
      packets: [
        { goal: "Implement blueprint registry with domain-specific generation rules", scope: ["packages/blueprints/src/"], risk: "medium" },
        { goal: "Implement real code synthesis — generate working TypeScript from blueprint + DAS", scope: ["packages/domain-builders/src/"], risk: "high" },
        { goal: "Implement workspace materializer with real file output", scope: ["apps/orchestrator-api/src/server_app.ts"], risk: "high" },
        { goal: "Prove generated app builds, runs, and passes /health smoke", scope: ["runtime/generated-apps/"], risk: "high" },
      ],
    },
    {
      id: "repair_replay",
      name: "Repair + Replay Engine",
      description: "Build the dirty-repo repair engine with diagnostics, patching, rollback, and replay.",
      dependsOn: ["builder_factory"],
      scope: ["packages/repair-loop/", "packages/repo-repair/", "packages/repo-audit/"],
      validators: ["validate:repair-engine", "validate:rollback"],
      evidence: ["repair-proof", "rollback-proof"],
      acceptance: ["detects 5 failure types", "patches apply cleanly", "rollback restores prior state"],
      packets: [
        { goal: "Implement failure classifier for 5 known failure types", scope: ["packages/repair-loop/src/"], risk: "medium" },
        { goal: "Implement deterministic patch engine with rollback snapshots", scope: ["packages/repo-repair/src/"], risk: "high" },
        { goal: "Implement repair replay with idempotency guarantee", scope: ["packages/repo-repair/src/"], risk: "medium" },
      ],
    },
    {
      id: "truth_memory",
      name: "State + Memory Engine",
      description: "Build the durable state substrate: persistent state objects, memory tiers, contradiction detection, and continuity guarantees.",
      dependsOn: ["repo_layout", "api_schema", "execution_runtime"],
      scope: ["packages/truth-engine/", "packages/memory-engine/", "packages/master-truth/"],
      validators: ["validate:truth-engine", "validate:memory-influence"],
      evidence: ["truth-proof", "memory-influence-proof"],
      acceptance: ["truth objects persist", "contradiction detection fires", "memory influences next action"],
      packets: [
        { goal: "Implement persistent state object schema with confidence, status, and conflict resolution", scope: ["packages/truth-engine/src/"], risk: "medium" },
        { goal: "Implement memory tiers with durable storage and retrieval guarantees", scope: ["packages/memory-engine/src/"], risk: "high" },
        { goal: "Prove memory tier influences downstream decisions, not just retrieval", scope: ["packages/memory-engine/src/"], risk: "high" },
      ],
    },
    {
      id: "intelligence_shell",
      name: "Application Shell + Control Interface",
      description: "Build the application frontend shell with navigation, core pages, interactive components, and operator control interface.",
      dependsOn: ["builder_factory", "truth_memory"],
      scope: ["apps/control-plane/src/", "apps/orchestrator-api/src/"],
      validators: ["validate:ui-shell", "validate:command-spine"],
      evidence: ["ui-shell-proof", "command-spine-proof"],
      acceptance: ["shell accepts user input", "control pane shows real state", "core surfaces render correctly"],
      packets: [
        { goal: "Implement primary input interface with natural language and structured command support", scope: ["apps/control-plane/src/components/CommandSpine"], risk: "medium" },
        { goal: "Implement operational status pane showing current state, changes, and pending actions", scope: ["apps/control-plane/src/components/FocusPane"], risk: "high" },
        { goal: "Implement core deep surfaces (state view, execution view, builder view)", scope: ["apps/control-plane/src/surfaces/"], risk: "high" },
      ],
    },
    {
      id: "governance_security",
      name: "Governance + Security",
      description: "Build RBAC, tenant isolation, approval tiers, secrets management, and autonomy policy.",
      dependsOn: ["repo_layout", "api_schema", "execution_runtime"],
      scope: ["packages/governance-engine/", "packages/autonomy-policy/", "packages/autonomy-tiers/"],
      validators: ["validate:rbac", "validate:tenant-isolation", "validate:secrets"],
      evidence: ["rbac-proof", "governance-proof"],
      acceptance: ["role guards enforced", "tenants isolated", "secrets never logged"],
      packets: [
        { goal: "Implement RBAC with role hierarchy and permission enforcement", scope: ["packages/governance-engine/src/"], risk: "high" },
        { goal: "Implement autonomy tier system with approval thresholds", scope: ["packages/autonomy-tiers/src/"], risk: "medium" },
        { goal: "Implement secrets management with no-log guarantee", scope: ["packages/governance-engine/src/"], risk: "high" },
      ],
    },
    {
      id: "deployment_rollback",
      name: "Deployment + Rollback",
      description: "Build export, dry-run, live deploy, credential injection, and rollback engine.",
      dependsOn: ["builder_factory", "governance_security"],
      scope: ["packages/vercel-adapter/", "packages/github-adapter/", "apps/orchestrator-api/src/"],
      validators: ["validate:deployment-gates", "validate:rollback"],
      evidence: ["deployment-proof", "rollback-proof"],
      acceptance: ["dry-run blocked from live deploy claim", "rollback always available", "credentials injected at deploy time"],
      packets: [
        { goal: "Implement export bundle with all assets and credentials excluded", scope: ["packages/vercel-adapter/src/"], risk: "medium" },
        { goal: "Implement dry-run mode with explicit cannot-claim-live-deploy gate", scope: ["apps/orchestrator-api/src/"], risk: "high" },
        { goal: "Implement live deployment pipeline with rollback checkpoint", scope: ["packages/vercel-adapter/src/"], risk: "high" },
      ],
    },
    {
      id: "validation_proof",
      name: "Validation + Proof System",
      description: "Build all validators, proof ladder, evidence artifacts, and claim boundaries.",
      dependsOn: ["repo_layout", "builder_factory"],
      scope: ["packages/validation/", "packages/proof-engine/", "packages/proof-gate/"],
      validators: ["validate:all", "validate:claim-boundary"],
      evidence: ["validation-proof", "claim-boundary-proof"],
      acceptance: ["all 78+ validators pass", "no validator passes on mock output", "claim boundary enforced"],
      packets: [
        { goal: "Implement proof ladder with BUILD → TEST → SMOKE → DEPLOY chain", scope: ["packages/proof-engine/src/"], risk: "medium" },
        { goal: "Implement claim boundary enforcement — no claim above evidence", scope: ["packages/proof-gate/src/"], risk: "high" },
        { goal: "Run validate:all and prove all validators pass deterministically", scope: ["packages/validation/src/"], risk: "medium" },
      ],
    },
    {
      id: "fresh_clone_proof",
      name: "Fresh-Clone End-to-End Proof",
      description: "Prove the full system works from a clean checkout: install → build → test → run → smoke.",
      dependsOn: [
        "repo_layout", "api_schema", "spec_compiler", "execution_runtime",
        "builder_factory", "repair_replay", "truth_memory", "governance_security",
        "deployment_rollback", "validation_proof",
      ],
      scope: ["*"],
      validators: ["validate:all", "test:universal", "build"],
      evidence: ["fresh-clone-proof", "e2e-proof", "smoke-proof"],
      acceptance: [
        "npm ci succeeds from clean checkout",
        "npm run build succeeds",
        "npm run test:universal passes",
        "npm run validate:all passes",
        "generated app build/run/smoke passes",
      ],
      packets: [
        { goal: "Run npm ci from clean state and verify all deps resolve", scope: ["package.json", "package-lock.json"], risk: "low" },
        { goal: "Run full build and test suite and record evidence", scope: ["*"], risk: "medium" },
        { goal: "Run builder forensic smoke suite and prove PASS_REAL > 90%", scope: ["scripts/builder-forensic/"], risk: "high" },
      ],
    },
  ];

  // Include waves that have signals in the spec, always include core waves
  const coreWaves = new Set(["repo_layout", "api_schema", "spec_compiler", "execution_runtime", "builder_factory", "validation_proof", "fresh_clone_proof"]);
  return catalog.filter((w) => coreWaves.has(w.id) || hints.has(w.id));
}

export function compileSpecToMission(input: CompilerInput): CompilerOutput {
  const { specText, sourceFile, projectId } = input;

  const sourceHash = sha256(specText);
  const productType = detectProductType(specText);
  const targetArchitecture = detectTargetArchitecture(specText);
  // specHash is deterministic: hash of (sourceHash + projectId + sorted wave IDs)
  const hints = detectWaveHints(specText);
  const waveDefs = buildWaveCatalog(hints);
  const waveIds = waveDefs.map((w) => w.id).sort().join(",");
  const specHash = sha256(`${sourceHash}:${projectId}:${waveIds}`);

  const now = new Date().toISOString();
  const missionId = `mission_${projectId}_${specHash.slice(0, 12)}`;

  const waves: MissionWave[] = waveDefs.map((def, index) => {
    const packets: MissionPacket[] = def.packets.map((p, pi) => ({
      packetId: `${def.id}-p${pi + 1}`,
      waveId: def.id,
      goal: p.goal,
      scope: p.scope,
      acceptanceCriteria: def.acceptance,
      riskLevel: p.risk,
    }));

    return {
      waveId: def.id,
      missionId,
      index,
      name: def.name,
      description: def.description,
      dependsOn: def.dependsOn,
      packets,
      requiredValidators: def.validators,
      evidenceRequirements: def.evidence,
      acceptanceCriteria: def.acceptance,
      status: "pending",
      evidence: [],
    };
  });

  const mission: Mission = {
    missionId,
    projectId,
    sourceFile,
    sourceHash,
    specHash,
    title: deriveTitle(specText, sourceFile),
    description: `Mission compiled from ${sourceFile} — ${waves.length} waves, ${waves.reduce((n, w) => n + w.packets.length, 0)} packets`,
    waves,
    status: "compiled",
    claimLevel: "MISSION_COMPILED",
    compiledAt: now,
    lastUpdatedAt: now,
    checkpoints: [],
    totalWaves: waves.length,
    provenWaves: 0,
  };

  return { mission, sourceHash, specHash, waveCount: waves.length, productType, targetArchitecture };
}
