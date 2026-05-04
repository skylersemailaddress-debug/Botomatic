#!/usr/bin/env node
/**
 * Run generic mission waves (dry-run by default).
 * Usage: node run-generic-wave.mjs [--dry-run] [--max-waves N] [--wave <waveId>]
 *
 * --wave <waveId>  Target a specific wave by ID. Only that wave will be executed
 *                  (it must be ready to run — all dependencies proven).
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission", "generic");
const CHECKPOINT_DIR = path.join(RECEIPT_DIR, "checkpoints");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    dryRun: args.includes("--dry-run"),
    apiBaseUrl: get("--api") ?? process.env.API_BASE_URL ?? "http://127.0.0.1:3001",
    apiToken: get("--token") ?? process.env.BOTOMATIC_API_TOKEN ?? "dev-api-token",
    maxWaves: parseInt(get("--max-waves") ?? "1", 10),
    targetWaveId: get("--wave") ?? null,
  };
}

async function main() {
  const args = parseArgs();

  const checkpointFile = path.join(CHECKPOINT_DIR, "mission-checkpoint.json");
  try {
    await fs.access(checkpointFile);
  } catch {
    console.error(`[run-generic-wave] No checkpoint found at ${checkpointFile}`);
    console.error("  Run: npm run -s test:mission:compile first");
    process.exit(1);
  }

  const script = `
import { runMission, loadCheckpoint } from "./packages/mission-orchestrator/src/missionRunner.ts";

(async () => {
  const mission = await loadCheckpoint(${JSON.stringify(CHECKPOINT_DIR)});
  if (!mission) { process.stderr.write("No checkpoint found\\n"); process.exit(1); }

  const config = {
    checkpointDir: ${JSON.stringify(CHECKPOINT_DIR)},
    apiBaseUrl: ${JSON.stringify(args.apiBaseUrl)},
    apiToken: ${JSON.stringify(args.apiToken)},
    dryRun: ${args.dryRun},
    maxWaves: ${args.maxWaves},
    targetWaveId: ${JSON.stringify(args.targetWaveId)},
  };

  const result = await runMission(mission, config);
  process.stdout.write(JSON.stringify(result, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-run-generic-wave.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60 * 1000 }
    );
    if (proc.status !== 0) {
      console.error("[run-generic-wave] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  // Save updated mission
  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");

  // Write wave-1 evidence receipt
  const wave1 = result.mission.waves[0];
  const wave1Checkpoint = result.mission.checkpoints.find(c => c.waveId === wave1?.waveId);
  const wave1Receipt = {
    waveId: wave1?.waveId,
    status: wave1?.status,
    claimLevel: result.finalClaimLevel,
    workspacePath: wave1Checkpoint?.workspacePath ?? null,
    artifactId: wave1Checkpoint?.artifactId ?? null,
    contentHash: wave1Checkpoint?.contentHash ?? null,
    buildStatus: wave1Checkpoint?.buildStatus ?? null,
    runStatus: wave1Checkpoint?.runStatus ?? null,
    smokeStatus: wave1Checkpoint?.smokeStatus ?? null,
    validatorsRun: wave1Checkpoint?.validatorsRun ?? [],
    proofRefs: wave1Checkpoint?.proofRefs ?? [],
  };
  await fs.writeFile(path.join(RECEIPT_DIR, "wave-1-execution.json"), JSON.stringify(wave1Receipt, null, 2), "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     GENERIC WAVE EXECUTION               ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nWaves run:    ${result.wavesRun}`);
  console.log(`Waves passed: ${result.wavesPassed}`);
  console.log(`Waves failed: ${result.wavesFailed}`);
  console.log(`Claim level:  ${result.finalClaimLevel}`);
  if (result.stopReason) console.log(`Stopped:      ${result.stopReason}`);
  if (wave1Checkpoint?.artifactId) console.log(`\nWave 1 artifact: ${wave1Checkpoint.artifactId}`);
  if (wave1Checkpoint?.workspacePath) console.log(`Wave 1 workspace: ${wave1Checkpoint.workspacePath}`);
  console.log(`\n[run-generic-wave] Receipt: ${path.join(RECEIPT_DIR, "wave-1-execution.json")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
