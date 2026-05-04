#!/usr/bin/env node
/**
 * Run a specific mission wave (or next ready wave) against the existing builder.
 * Usage: node run-mission-wave.mjs [--wave <waveId>] [--dry-run] [--mission <mission-json>]
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission");
const CHECKPOINT_DIR = path.join(RECEIPT_DIR, "checkpoints");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };
  return {
    waveId: get("--wave"),
    dryRun: args.includes("--dry-run"),
    missionFile: get("--mission") ?? path.join(RECEIPT_DIR, "nexus-mission.json"),
    apiBaseUrl: get("--api") ?? process.env.API_BASE_URL ?? "http://127.0.0.1:3001",
    apiToken: get("--token") ?? process.env.BOTOMATIC_API_TOKEN ?? "dev-api-token",
    maxWaves: parseInt(get("--max-waves") ?? "1", 10),
  };
}

async function main() {
  const args = parseArgs();

  let mission;
  try {
    const raw = await fs.readFile(args.missionFile, "utf8");
    mission = JSON.parse(raw);
  } catch {
    console.error(`[run-mission-wave] Mission file not found: ${args.missionFile}`);
    console.error(`  Run: npm run -s test:mission:nexus:compile first`);
    process.exit(1);
  }

  const runnerScript = `
import { runMission } from "./packages/mission-orchestrator/src/missionRunner.ts";
import fs from "fs";

(async () => {
  const mission = JSON.parse(fs.readFileSync(${JSON.stringify(args.missionFile)}, "utf8"));
  const config = {
    checkpointDir: ${JSON.stringify(CHECKPOINT_DIR)},
    apiBaseUrl: ${JSON.stringify(args.apiBaseUrl)},
    apiToken: ${JSON.stringify(args.apiToken)},
    dryRun: ${args.dryRun},
    maxWaves: ${args.maxWaves},
  };
  const result = await runMission(mission, config);
  process.stdout.write(JSON.stringify(result, null, 2));
})().catch(e => { process.stderr.write(String(e)); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-run-wave.ts");
  await fs.writeFile(tmpScript, runnerScript, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60 * 1000 }
    );
    if (proc.status !== 0) {
      console.error("[run-mission-wave] Runner error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  // Update mission receipt with result
  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.writeFile(args.missionFile, JSON.stringify(result.mission, null, 2), "utf8");

  console.log(`\n[run-mission-wave] Wave run complete`);
  console.log(`  Waves run:    ${result.wavesRun}`);
  console.log(`  Waves passed: ${result.wavesPassed}`);
  console.log(`  Waves failed: ${result.wavesFailed}`);
  console.log(`  Claim level:  ${result.finalClaimLevel}`);
  if (result.stopReason) console.log(`  Stop reason:  ${result.stopReason}`);

  if (result.wavesFailed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
