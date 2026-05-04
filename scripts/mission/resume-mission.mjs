#!/usr/bin/env node
/**
 * Resume the Nexus mission from last checkpoint, running all remaining waves.
 * Usage: node resume-mission.mjs [--dry-run] [--max-waves N]
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
    maxWaves: parseInt(get("--max-waves") ?? "999", 10),
  };
}

async function main() {
  const args = parseArgs();

  const checkpointFile = path.join(CHECKPOINT_DIR, "mission-checkpoint.json");
  try {
    await fs.access(checkpointFile);
    const cp = JSON.parse(await fs.readFile(checkpointFile, "utf8"));
    const proven = cp.waves?.filter(w => w.status === "proven").length ?? 0;
    const total = cp.totalWaves ?? cp.waves?.length ?? 0;
    console.log(`[resume-mission] Checkpoint: ${cp.missionId}`);
    console.log(`  Progress:    ${proven}/${total} waves proven`);
    console.log(`  Claim level: ${cp.claimLevel}`);
    console.log(`  Mode:        ${args.dryRun ? "dry-run" : "LIVE (hits API)"}`);
  } catch {
    console.error(`[resume-mission] No checkpoint found — run npm run test:mission:nexus:compile first`);
    process.exit(1);
  }

  const script = `
import { resumeMission } from "./packages/mission-orchestrator/src/missionRunner.ts";

(async () => {
  const config = {
    checkpointDir: ${JSON.stringify(CHECKPOINT_DIR)},
    apiBaseUrl: ${JSON.stringify(args.apiBaseUrl)},
    apiToken: ${JSON.stringify(args.apiToken)},
    dryRun: ${args.dryRun},
    maxWaves: ${args.maxWaves},
  };
  const result = await resumeMission(config.checkpointDir, config);
  if (!result) { process.stderr.write("No checkpoint\\n"); process.exit(1); }
  process.stdout.write(JSON.stringify(result, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-resume-nexus.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 30 * 60 * 1000 }
    );
    if (proc.status !== 0) {
      console.error("[resume-mission] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║        NEXUS MISSION RESUMED             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nWaves run:    ${result.wavesRun}`);
  console.log(`Waves passed: ${result.wavesPassed}`);
  console.log(`Waves failed: ${result.wavesFailed}`);
  console.log(`Claim level:  ${result.finalClaimLevel}`);
  console.log(`Status:       ${result.mission.status}`);
  if (result.stopReason) console.log(`Stopped:      ${result.stopReason}`);
  console.log(`\nWave summary:`);
  for (const w of result.mission.waves) {
    const icon = w.status === "proven" ? "✅" : w.status === "failed" ? "❌" : w.status === "running" ? "🔄" : "⏳";
    console.log(`  ${icon} [${w.index + 1}] ${w.waveId} — ${w.status}`);
  }
  console.log(`\nReceipt: ${RECEIPT_DIR}/mission.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
