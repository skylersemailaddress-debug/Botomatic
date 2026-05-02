import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function runProof(command: string) {
  execSync(command, { stdio: "inherit" });
}

function run() {
  const root = process.cwd();
  const runtimeDir = path.join(root, "release-evidence", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });

  runProof("npm run -s proof:max-power-domain-permutations");
  runProof("npm run -s proof:live-ui-source-sync-before-export-launch");
  runProof("tsx packages/validation/src/runtime/proofNoDemoContamination.ts");
  runProof("tsx packages/validation/src/runtime/proofIntakeProjectMutationContract.ts");

  const domainIndexPath = path.join(runtimeDir, "max_power_domain_permutation_index.json");
  const liveUiProofPath = path.join(runtimeDir, "live_ui_source_sync_before_export_launch_proof.json");
  const noDemoPath = path.join(runtimeDir, "no_demo_contamination_audit.json");
  const intakeMutationPath = path.join(runtimeDir, "intake_project_mutation_contract_proof.json");
  const blockerPath = path.join(runtimeDir, "max_power_blocker_resolution.json");
  const maxPowerProofPath = path.join(runtimeDir, "max_power_completion_proof.json");

  const domainIndex = readJson(domainIndexPath);
  const liveUiProof = readJson(liveUiProofPath);
  const noDemoProof = readJson(noDemoPath);
  const intakeMutationProof = readJson(intakeMutationPath);

  const blockers = [
    {
      id: "MAX-POWER-DOMAIN-PERMUTATION-CORPUS",
      state: domainIndex.status === "passed" ? "closed" : "open",
      evidence: "release-evidence/runtime/max_power_domain_permutation_index.json",
    },
    {
      id: "LIVE-UI-SOURCE-SYNC-BEFORE-EXPORT-LAUNCH",
      state: liveUiProof.status === "passed" ? "closed" : "open",
      evidence: "release-evidence/runtime/live_ui_source_sync_before_export_launch_proof.json",
    },
    {
      id: "NO-DEMO-CONTAMINATION-REAL-PROJECTS",
      state: noDemoProof.status === "passed" ? "closed" : "open",
      evidence: "release-evidence/runtime/no_demo_contamination_audit.json",
    },
    {
      id: "INTAKE-PROJECT-MUTATION-CONTRACT",
      state: intakeMutationProof.status === "passed" ? "closed" : "open",
      evidence: "release-evidence/runtime/intake_project_mutation_contract_proof.json",
    },
  ];

  const blockerResolution = {
    status: blockers.every((b) => b.state === "closed") ? "passed" : "failed",
    blockers,
    criticalFailures: blockers.filter((b) => b.state !== "closed").length,
    generatedAt: new Date().toISOString(),
  };
  writeJson(blockerPath, blockerResolution);

  const maxPowerProof = {
    status:
      blockerResolution.status === "passed" &&
      domainIndex.status === "passed" &&
      liveUiProof.status === "passed" &&
      noDemoProof.status === "passed" &&
      intakeMutationProof.status === "passed"
        ? "passed"
        : "failed",
    maxPowerComplete:
      blockerResolution.status === "passed" &&
      domainIndex.status === "passed" &&
      liveUiProof.status === "passed" &&
      noDemoProof.status === "passed" &&
      intakeMutationProof.status === "passed",
    supportedDomainMaxPowerComplete: domainIndex.status === "passed",
    representativeOnly: false,
    exhaustiveSupportedDomainProof: domainIndex.status === "passed",
    liveUiSourceSyncProof: liveUiProof.status === "passed",
    noDemoContaminationForRealProjects: noDemoProof.status === "passed",
    intakeProjectMutationContractProof: intakeMutationProof.status === "passed",
    blockersClosed: blockerResolution.status === "passed",
    criticalFailures:
      [
        domainIndex.status === "passed",
        liveUiProof.status === "passed",
        noDemoProof.status === "passed",
        intakeMutationProof.status === "passed",
        blockerResolution.status === "passed",
      ].filter((ok) => !ok).length,
    generatedAt: new Date().toISOString(),
  };

  writeJson(maxPowerProofPath, maxPowerProof);

  console.log(
    `Max-power completion proof updated: status=${maxPowerProof.status} criticalFailures=${maxPowerProof.criticalFailures}`
  );

  if (maxPowerProof.status !== "passed") process.exit(1);
}

run();
