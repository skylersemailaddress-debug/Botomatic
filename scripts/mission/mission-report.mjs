#!/usr/bin/env node
/**
 * Generate a mission status report from the current mission receipt.
 * Usage: node mission-report.mjs [--mission <path>]
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission");

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--mission");
  return {
    missionFile: idx !== -1 ? args[idx + 1] : path.join(RECEIPT_DIR, "nexus-mission.json"),
  };
}

async function main() {
  const args = parseArgs();

  let mission;
  try {
    const raw = await fs.readFile(args.missionFile, "utf8");
    mission = JSON.parse(raw);
  } catch {
    console.error(`[mission-report] Mission file not found: ${args.missionFile}`);
    process.exit(1);
  }

  const reportScript = `
import { formatClaimBoundaryReport } from "./packages/mission-orchestrator/src/missionClaimBoundary.ts";
import { planWaves } from "./packages/mission-orchestrator/src/wavePlanner.ts";
import fs from "fs";

(async () => {
  const mission = JSON.parse(fs.readFileSync(${JSON.stringify(args.missionFile)}, "utf8"));
  const { readyWaves, blockedWaves } = planWaves(mission);
  const claimReport = formatClaimBoundaryReport(mission);
  const report = {
    missionId: mission.missionId,
    title: mission.title,
    status: mission.status,
    claimLevel: mission.claimLevel,
    totalWaves: mission.totalWaves,
    provenWaves: mission.provenWaves,
    readyWaveCount: readyWaves.length,
    blockedWaveCount: blockedWaves.length,
    waves: mission.waves.map(w => ({
      waveId: w.waveId,
      name: w.name,
      status: w.status,
      dependsOn: w.dependsOn,
      packetCount: w.packets.length,
      evidenceCount: w.evidence.length,
    })),
    claimBoundaryReport: claimReport,
    unprovenWaves: mission.waves.filter(w => w.status !== "proven").map(w => w.waveId),
  };
  process.stdout.write(JSON.stringify(report, null, 2));
})().catch(e => { process.stderr.write(String(e)); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-mission-report.ts");
  await fs.writeFile(tmpScript, reportScript, "utf8");

  let report;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[mission-report] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    report = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  // Write claim boundary receipt
  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RECEIPT_DIR, "nexus-claim-boundary.md"),
    report.claimBoundaryReport,
    "utf8"
  );

  // Print report
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║         MISSION STATUS REPORT            ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`\nMission:      ${report.missionId}`);
  console.log(`Status:       ${report.status}`);
  console.log(`Claim level:  ${report.claimLevel}`);
  console.log(`Progress:     ${report.provenWaves}/${report.totalWaves} waves proven`);
  console.log(`Ready:        ${report.readyWaveCount} wave(s) ready to run`);
  console.log(`Blocked:      ${report.blockedWaveCount} wave(s) blocked`);

  console.log(`\nWave Status:`);
  for (const w of report.waves) {
    const icon = w.status === "proven" ? "✅" : w.status === "failed" ? "❌" : w.status === "running" ? "🔄" : "⏳";
    const deps = w.dependsOn.length > 0 ? ` (needs: ${w.dependsOn.join(", ")})` : "";
    console.log(`  ${icon} [${w.status.padEnd(7)}] ${w.waveId} — ${w.name}${deps}`);
  }

  if (report.unprovenWaves.length > 0) {
    console.log(`\nUnproven waves (${report.unprovenWaves.length}):`);
    for (const id of report.unprovenWaves) console.log(`  - ${id}`);
  }

  console.log(`\n${report.claimBoundaryReport}`);
  console.log(`\n[mission-report] Receipt: ${path.join(RECEIPT_DIR, "nexus-claim-boundary.md")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
