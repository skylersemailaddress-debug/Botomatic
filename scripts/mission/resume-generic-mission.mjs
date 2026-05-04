#!/usr/bin/env node
/**
 * Resume a generic mission from the last checkpoint.
 * Usage: node resume-generic-mission.mjs [--dry-run] [--max-waves N]
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
    maxWaves: parseInt(get("--max-waves") ?? "999", 10),
  };
}

async function main() {
  const args = parseArgs();

  const checkpointFile = path.join(CHECKPOINT_DIR, "mission-checkpoint.json");
  try {
    await fs.access(checkpointFile);
    const checkpoint = JSON.parse(await fs.readFile(checkpointFile, "utf8"));
    const proven = checkpoint.waves?.filter((w) => w.status === "proven").length ?? 0;
    const total = checkpoint.totalWaves ?? checkpoint.waves?.length ?? 0;
    console.log(`[resume-generic-mission] Found checkpoint: ${checkpoint.missionId}`);
    console.log(`  Progress: ${proven}/${total} waves proven`);
    console.log(`  Claim level: ${checkpoint.claimLevel}`);
  } catch {
    console.error(`[resume-generic-mission] No checkpoint found at ${checkpointFile}`);
    console.error("  Run: npm run -s test:mission:compile then npm run -s test:mission:wave1 first");
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
  if (!result) { process.stderr.write("No checkpoint found\\n"); process.exit(1); }
  process.stdout.write(JSON.stringify(result, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-resume-generic.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 30 * 60 * 1000 }
    );
    if (proc.status !== 0) {
      console.error("[resume-generic-mission] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");

  console.log(`\n[resume-generic-mission] Resume complete`);
  console.log(`  Waves run:    ${result.wavesRun}`);
  console.log(`  Waves passed: ${result.wavesPassed}`);
  console.log(`  Waves failed: ${result.wavesFailed}`);
  console.log(`  Claim level:  ${result.finalClaimLevel}`);
  if (result.stopReason) console.log(`  Reason:       ${result.stopReason}`);
  console.log(`\n[resume-generic-mission] RESUME_PROOF: loaded checkpoint and executed continuation`);
}

main().catch((err) => { console.error(err); process.exit(1); });
