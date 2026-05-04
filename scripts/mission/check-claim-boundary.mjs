#!/usr/bin/env node
/**
 * Evaluate claim boundary for the current generic mission.
 * Usage: node check-claim-boundary.mjs [--mission <path>]
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

  try { await fs.access(args.missionFile); } catch {
    console.error(`[check-claim-boundary] Mission not found: ${args.missionFile}`);
    console.error("  Run: npm run -s test:mission:compile first");
    process.exit(1);
  }

  const script = `
import { evaluateMissionClaim, checkClaimBoundary, formatClaimBoundaryReport } from "./packages/mission-orchestrator/src/missionClaimBoundary.ts";
import fs from "fs";

(async () => {
  const mission = JSON.parse(fs.readFileSync(${JSON.stringify(args.missionFile)}, "utf8"));
  const current = evaluateMissionClaim(mission);
  const levels = ["MISSION_COMPILED","WAVE_READY","WAVE_PROVEN","SYSTEM_PARTIAL","SYSTEM_BUILDABLE","SYSTEM_RUNTIME_PROVEN","SYSTEM_LAUNCH_READY"];
  const checks = levels.map(l => ({ level: l, ...checkClaimBoundary(mission, l) }));
  const report = formatClaimBoundaryReport(mission);
  process.stdout.write(JSON.stringify({ currentLevel: current, checks, report }, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-check-claim.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[check-claim-boundary] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.writeFile(path.join(RECEIPT_DIR, "claim-boundary.md"), result.report, "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     CLAIM BOUNDARY CHECK                 ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nCurrent level: ${result.currentLevel}`);
  console.log("\nLevel checks:");
  for (const c of result.checks) {
    const icon = c.allowed ? "✅" : "🔒";
    console.log(`  ${icon} ${c.level}: ${c.allowed ? "allowed" : `blocked — ${c.reason}`}`);
  }
  console.log(`\n[check-claim-boundary] Receipt: ${path.join(RECEIPT_DIR, "claim-boundary.md")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
