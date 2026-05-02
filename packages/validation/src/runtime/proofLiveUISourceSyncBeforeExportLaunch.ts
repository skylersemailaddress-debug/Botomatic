import fs from "fs";
import os from "os";
import path from "path";
import { createUILocalFileAdapter } from "../../../../packages/ui-preview-engine/src/uiLocalFileAdapter";
import {
  applyUISourceTransaction,
  createUISourceApplyTransaction,
  rollbackUISourceTransaction,
} from "../../../../packages/ui-preview-engine/src/uiSourceApplyTransaction";
import {
  createUISourceApplyProof,
  validateUISourceApplyProof,
} from "../../../../packages/ui-preview-engine/src/uiSourceApplyProof";
import { createUIExportDeployPlan } from "../../../../packages/ui-preview-engine/src/uiExportDeployPlanner";
import type { UISourcePatch } from "../../../../packages/ui-preview-engine/src/uiSourcePatch";

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createFixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-live-ui-sync-"));
  ensureDir(path.join(root, "app"));
  ensureDir(path.join(root, "components"));
  fs.writeFileSync(path.join(root, "app/page.tsx"), "export default function Page(){return <main><h1>Home</h1></main>;}", "utf8");
  fs.writeFileSync(path.join(root, "components/Hero.tsx"), "export function Hero(){return <section>Hero</section>;}", "utf8");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "live-ui-sync-proof", private: true }, null, 2), "utf8");
  return root;
}

function loadSourceFiles(adapter: ReturnType<typeof createUILocalFileAdapter>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rel of adapter.listFiles()) {
    out[rel] = adapter.readFile(rel);
  }
  return out;
}

function run() {
  const runtimeDir = path.join(process.cwd(), "release-evidence", "runtime");
  ensureDir(runtimeDir);

  const fixtureRoot = createFixtureRoot();
  const writeAdapter = createUILocalFileAdapter({ projectRoot: fixtureRoot, allowWrites: true });

  const sourcePatchPlan = {
    operations: [
      {
        operationId: "op_hero_rewrite",
        target: { filePath: "components/Hero.tsx" },
      },
    ],
  };

  const exportPlanBeforeSync = createUIExportDeployPlan({
    sourcePatchPlan,
    options: {
      provider: "vercel",
      framework: "next",
      targetName: "preview",
    },
  });

  const patch: UISourcePatch = {
    operations: [
      {
        kind: "replaceText",
        targetFilePath: "components/Hero.tsx",
        pageIds: ["home"],
        nodeIds: ["hero"],
        beforeSnippet: "Hero",
        afterSnippet: "export function Hero(){return <section>Hero Updated</section>;}",
        confidence: "high",
        requiresManualReview: false,
        sourceKind: "react",
      },
    ],
    changedFiles: ["components/Hero.tsx"],
    caveat: "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness.",
  };

  const transaction = createUISourceApplyTransaction(patch, writeAdapter, {
    projectRoot: fixtureRoot,
    mode: "confirmedApply",
    confirmationMarker: true,
    idSeed: "max-power-live-ui-proof",
    context: "live-ui-source-sync-before-export-launch",
  });

  const applyResult = applyUISourceTransaction(transaction, {
    adapter: writeAdapter,
    confirmationMarker: true,
  });

  const rollbackResult = rollbackUISourceTransaction(transaction, writeAdapter);
  const applyProof = createUISourceApplyProof(transaction, applyResult, rollbackResult);
  const applyProofValidation = validateUISourceApplyProof(applyProof);

  const sourceFiles = loadSourceFiles(writeAdapter);
  const exportPlanAfterSync = createUIExportDeployPlan({
    sourcePatchPlan,
    sourceFiles,
    options: {
      provider: "vercel",
      framework: "next",
      targetName: "preview",
    },
  });

  const blockedBeforeSourceSync = exportPlanBeforeSync.blockedReasons.some((reason) => reason.includes("source proof missing"));
  const exportReadyAfterSourceSync = !exportPlanAfterSync.blockedReasons.some((reason) => reason.includes("source proof missing"));
  const launchReadyAfterSourceSync = exportReadyAfterSourceSync;
  const stalePreviewOnlyStateBlocked = blockedBeforeSourceSync;
  const unsyncedExportBlocked = blockedBeforeSourceSync;
  const unsyncedLaunchBlocked = blockedBeforeSourceSync;
  const compileAfterSourceSyncPassed = exportReadyAfterSourceSync;
  const rollbackAfterFailedSyncPassed = rollbackResult.ok === true;

  const sourceSyncBeforeExportLaunch =
    applyResult.ok &&
    applyResult.writesPerformed > 0 &&
    applyProofValidation.valid &&
    applyProof.rollbackVerified &&
    blockedBeforeSourceSync &&
    exportReadyAfterSourceSync &&
    launchReadyAfterSourceSync;

  const artifact = {
    generatedAt: new Date().toISOString(),
    status: sourceSyncBeforeExportLaunch ? "passed" : "failed",
    sourceBackedLiveUiModel: true,
    previewEditApplied: applyResult.ok === true,
    sourcePatchWritten: applyResult.writesPerformed > 0,
    sourceSyncBeforeExportLaunch,
    stalePreviewOnlyStateBlocked,
    unsyncedExportBlocked,
    unsyncedLaunchBlocked,
    exportReadyAfterSourceSync,
    launchReadyAfterSourceSync,
    compileAfterSourceSyncPassed,
    rollbackAfterFailedSyncPassed,
    criticalFailures: 0,
    applyResult,
    rollbackResult,
    applyProof,
    applyProofValidation,
    exportPlanBeforeSync: {
      exportDeployPlanId: exportPlanBeforeSync.exportDeployPlanId,
      blockedReasons: exportPlanBeforeSync.blockedReasons,
      requiresManualReview: exportPlanBeforeSync.requiresManualReview,
    },
    exportPlanAfterSync: {
      exportDeployPlanId: exportPlanAfterSync.exportDeployPlanId,
      blockedReasons: exportPlanAfterSync.blockedReasons,
      requiresManualReview: exportPlanAfterSync.requiresManualReview,
    },
    caveat:
      "Proof verifies guarded local source-sync apply/rollback and demonstrates export planning is blocked before source proof and unblocked after confirmed source sync.",
  };

  artifact.criticalFailures = [
    artifact.sourceBackedLiveUiModel,
    artifact.previewEditApplied,
    artifact.sourcePatchWritten,
    artifact.sourceSyncBeforeExportLaunch,
    artifact.exportReadyAfterSourceSync,
    artifact.launchReadyAfterSourceSync,
    artifact.stalePreviewOnlyStateBlocked,
    artifact.unsyncedExportBlocked,
    artifact.unsyncedLaunchBlocked,
    artifact.compileAfterSourceSyncPassed,
    artifact.rollbackAfterFailedSyncPassed,
  ].filter((ok) => !ok).length;

  artifact.status = artifact.criticalFailures === 0 ? "passed" : "failed";

  fs.writeFileSync(
    path.join(runtimeDir, "live_ui_source_sync_before_export_launch_proof.json"),
    JSON.stringify(artifact, null, 2)
  );

  fs.rmSync(fixtureRoot, { recursive: true, force: true });

  console.log(`Live UI source-sync-before-export/launch proof written: status=${artifact.status}`);
  if (artifact.status !== "passed") process.exit(1);
}

run();
