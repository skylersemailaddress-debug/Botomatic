#!/usr/bin/env node
/**
 * Build and lock a MissionContract from a compiled generic mission.
 * Usage: node lock-mission-contract.mjs [--mission <path>]
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission", "generic");

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--mission");
  return { missionFile: i !== -1 ? args[i + 1] : path.join(RECEIPT_DIR, "mission.json") };
}

async function main() {
  const args = parseArgs();

  let mission;
  try {
    mission = JSON.parse(await fs.readFile(args.missionFile, "utf8"));
  } catch {
    console.error(`[lock-mission-contract] Mission file not found: ${args.missionFile}`);
    console.error("  Run: npm run -s test:mission:compile first");
    process.exit(1);
  }

  const script = `
import { buildContractFromSpec, lockContract, canExecuteMission } from "./packages/mission-orchestrator/src/missionContract.ts";
import { detectTargetArchitecture, detectProductType } from "./packages/mission-orchestrator/src/missionTargets.ts";
import fs from "fs";

(async () => {
  const mission = JSON.parse(fs.readFileSync(${JSON.stringify(args.missionFile)}, "utf8"));

  const contract = buildContractFromSpec({
    missionId: mission.missionId,
    projectId: mission.projectId,
    sourceSpecHash: mission.sourceHash,
    sourceType: "file",
    productType: "general_app",
    targetArchitecture: "full_stack_app",
    detectedCapabilities: [],
    requiredWaves: mission.waves.map(w => w.waveId),
    unresolvedQuestions: [],
    assumptions: [
      { id: "a_email", field: "email_provider", decision: "Use default transactional email", reason: "Low-risk default", risk: "low", autoDecided: true },
    ],
    excludedScope: [],
    acceptanceCriteria: mission.waves.flatMap(w => w.acceptanceCriteria).slice(0, 5),
  });

  const locked = lockContract(contract, "system_autopilot");
  const check = canExecuteMission(locked);
  process.stdout.write(JSON.stringify({ contract: locked, canExecute: check }, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-lock-contract.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[lock-mission-contract] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.writeFile(path.join(RECEIPT_DIR, "contract.json"), JSON.stringify(result.contract, null, 2), "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     MISSION CONTRACT LOCKED              ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nMission ID:       ${result.contract.missionId}`);
  console.log(`Product type:     ${result.contract.productType}`);
  console.log(`Architecture:     ${result.contract.targetArchitecture}`);
  console.log(`Approved:         ${result.contract.userApproved}`);
  console.log(`Locked at:        ${result.contract.lockedAt}`);
  console.log(`Can execute:      ${result.canExecute.allowed}`);
  if (!result.canExecute.allowed) console.log(`Reason:           ${result.canExecute.reason}`);
  console.log(`Assumptions:      ${result.contract.assumptions.length}`);
  console.log(`Blockers:         ${result.contract.blockers.length}`);
  console.log(`\n[lock-mission-contract] Receipt: ${path.join(RECEIPT_DIR, "contract.json")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
