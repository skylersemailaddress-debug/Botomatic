#!/usr/bin/env node
/**
 * Generate a mission status report for a generic mission.
 * Usage: node generic-mission-report.mjs [--mission <path>]
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
  const idx = args.indexOf("--mission");
  return {
    missionFile: idx !== -1 ? args[idx + 1] : path.join(RECEIPT_DIR, "mission.json"),
  };
}

async function main() {
  const args = parseArgs();

  try { await fs.access(args.missionFile); } catch {
    console.error(`[generic-mission-report] Mission file not found: ${args.missionFile}`);
    console.error("  Run: npm run -s test:mission:compile first");
    process.exit(1);
  }

  const reportScript = `
import { formatClaimBoundaryReport, evaluateMissionClaim } from "./packages/mission-orchestrator/src/missionClaimBoundary.ts";
import { planWaves } from "./packages/mission-orchestrator/src/wavePlanner.ts";
import { getMissionProgress, formatUserFacingStatus } from "./packages/mission-orchestrator/src/missionStages.ts";
import fs from "fs";

(async () => {
  const mission = JSON.parse(fs.readFileSync(${JSON.stringify(args.missionFile)}, "utf8"));
  const { readyWaves, blockedWaves } = planWaves(mission);
  const claimReport = formatClaimBoundaryReport(mission);
  const currentLevel = evaluateMissionClaim(mission);
  const progress = getMissionProgress(mission, null);
  const userStatus = formatUserFacingStatus(progress);

  const report = {
    missionId: mission.missionId,
    title: mission.title || mission.missionId,
    status: mission.status,
    claimLevel: currentLevel,
    totalWaves: mission.waves.length,
    provenWaves: mission.waves.filter(w => w.status === "proven").length,
    readyWaveCount: readyWaves.length,
    blockedWaveCount: blockedWaves.length,
    userStage: progress.stage,
    userStatus,
    waves: mission.waves.map(w => ({
      waveId: w.waveId,
      name: w.name,
      status: w.status,
      waveType: w.waveType,
      dependsOn: w.dependsOn,
      packetCount: w.packets.length,
      evidenceCount: w.evidence.length,
      artifactId: w.artifactId ?? null,
      workspacePath: w.workspacePath ?? null,
    })),
    claimBoundaryReport: claimReport,
    unprovenWaves: mission.waves.filter(w => w.status !== "proven").map(w => w.waveId),
  };
  process.stdout.write(JSON.stringify(report, null, 2));
})().catch(e => { process.stderr.write(String(e)); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-generic-report.ts");
  await fs.writeFile(tmpScript, reportScript, "utf8");

  let report;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[generic-mission-report] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    report = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RECEIPT_DIR, "claim-boundary.md"),
    report.claimBoundaryReport,
    "utf8"
  );

  // Write JSON report receipt
  const jsonReport = {
    missionId: report.missionId,
    claimLevel: report.claimLevel,
    provenWaves: report.provenWaves,
    totalWaves: report.totalWaves,
    userStage: report.userStage,
    waves: report.waves,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(RECEIPT_DIR, "report.json"), JSON.stringify(jsonReport, null, 2), "utf8");

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║     GENERIC MISSION STATUS REPORT        ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`\nMission:      ${report.missionId}`);
  console.log(`Status:       ${report.status}`);
  console.log(`Claim level:  ${report.claimLevel}`);
  console.log(`Progress:     ${report.provenWaves}/${report.totalWaves} waves proven`);
  console.log(`Ready:        ${report.readyWaveCount} wave(s) ready to run`);
  console.log(`Blocked:      ${report.blockedWaveCount} wave(s) blocked`);
  console.log(`\nUser-facing:  ${report.userStatus}`);

  console.log(`\nWave Status:`);
  for (const w of report.waves) {
    const icon = w.status === "proven" ? "✅" : w.status === "failed" ? "❌" : w.status === "running" ? "🔄" : "⏳";
    const deps = w.dependsOn.length > 0 ? ` (needs: ${w.dependsOn.join(", ")})` : "";
    const artifact = w.artifactId ? ` [artifact: ${w.artifactId}]` : "";
    console.log(`  ${icon} [${w.status.padEnd(7)}] ${w.waveId} — ${w.name}${deps}${artifact}`);
  }

  if (report.unprovenWaves.length > 0) {
    console.log(`\nUnproven waves (${report.unprovenWaves.length}):`);
    for (const id of report.unprovenWaves) console.log(`  - ${id}`);
  }

  console.log(`\n${report.claimBoundaryReport}`);
  console.log(`\n[generic-mission-report] Receipt: ${path.join(RECEIPT_DIR, "claim-boundary.md")}`);
  console.log(`[generic-mission-report] JSON:    ${path.join(RECEIPT_DIR, "report.json")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
