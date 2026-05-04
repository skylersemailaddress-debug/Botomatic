#!/usr/bin/env node
/**
 * Run the next (or a specific) Nexus mission wave.
 * Usage: node run-mission-wave.mjs [--dry-run] [--wave <waveId>] [--max-waves N]
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission", "nexus");
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
    console.error(`[run-mission-wave] No Nexus checkpoint found at ${checkpointFile}`);
    console.error("  Run: npm run test:mission:nexus:compile first");
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

  const tmpScript = path.join(ROOT, ".tmp-run-nexus-wave.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60 * 1000 }
    );
    if (proc.status !== 0) {
      console.error("[run-mission-wave] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║        NEXUS WAVE EXECUTION              ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nWaves run:    ${result.wavesRun}`);
  console.log(`Waves passed: ${result.wavesPassed}`);
  console.log(`Waves failed: ${result.wavesFailed}`);
  console.log(`Claim level:  ${result.finalClaimLevel}`);
  if (result.stopReason) console.log(`Stopped:      ${result.stopReason}`);

  const lastCheckpoint = result.mission.checkpoints.at(-1);
  if (lastCheckpoint?.artifactId) console.log(`\nArtifact: ${lastCheckpoint.artifactId}`);
  if (lastCheckpoint?.workspacePath) console.log(`Workspace: ${lastCheckpoint.workspacePath}`);
  console.log(`\nReceipt: ${RECEIPT_DIR}/mission.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
