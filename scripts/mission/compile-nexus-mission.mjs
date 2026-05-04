#!/usr/bin/env node
/**
 * Compile the Nexus mission from the canonical Nexus spec fixture.
 * Usage: node compile-nexus-mission.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission", "nexus");
const CHECKPOINT_DIR = path.join(RECEIPT_DIR, "checkpoints");

async function main() {
  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });

  const script = `
import { compileSpecToMission } from "./packages/mission-orchestrator/src/specToMissionCompiler.ts";
import { NEXUS_BENCHMARK_SPEC, NEXUS_BENCHMARK_PROJECT_ID } from "./packages/mission-orchestrator/src/fixtures/nexus.ts";

(async () => {
  const result = compileSpecToMission({
    specText: NEXUS_BENCHMARK_SPEC,
    sourceFile: "packages/mission-orchestrator/src/fixtures/nexus.ts",
    projectId: NEXUS_BENCHMARK_PROJECT_ID,
  });
  process.stdout.write(JSON.stringify(result, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-compile-nexus.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[compile-nexus-mission] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");
  await fs.writeFile(path.join(CHECKPOINT_DIR, "mission-checkpoint.json"), JSON.stringify(result.mission, null, 2), "utf8");

  // Wave plan CSV
  const csvLines = ["index,waveId,name,packets,dependsOn,riskLevel"];
  for (const w of result.mission.waves) {
    const deps = w.dependsOn.join("|") || "none";
    csvLines.push(`${w.index + 1},${w.waveId},"${w.name}",${w.packets.length},${deps},${w.riskLevel ?? "medium"}`);
  }
  await fs.writeFile(path.join(RECEIPT_DIR, "nexus-wave-plan.csv"), csvLines.join("\n"), "utf8");

  // Claim boundary markdown
  const claimMd = [
    `# Nexus Claim Boundary`,
    ``,
    `**Mission ID:** ${result.mission.missionId}`,
    `**Spec hash:** ${result.specHash}`,
    `**Compiled at:** ${result.mission.compiledAt}`,
    `**Current claim level:** ${result.mission.claimLevel}`,
    ``,
    `## Wave Plan (${result.waveCount} waves)`,
    ...result.mission.waves.map(w => `- **[${w.index + 1}] ${w.waveId}** — ${w.name} (${w.packets.length} packets)`),
  ].join("\n");
  await fs.writeFile(path.join(RECEIPT_DIR, "nexus-claim-boundary.md"), claimMd, "utf8");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║        NEXUS MISSION COMPILED            ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nMission ID:   ${result.mission.missionId}`);
  console.log(`Spec hash:    ${result.specHash.slice(0, 16)}...`);
  console.log(`Product type: ${result.productType}`);
  console.log(`Architecture: ${result.targetArchitecture}`);
  console.log(`Waves:        ${result.waveCount}`);
  console.log(`Packets:      ${result.mission.waves.reduce((n, w) => n + w.packets.length, 0)}`);
  console.log(`Claim level:  ${result.mission.claimLevel}`);
  console.log(`\nWave order:`);
  for (const w of result.mission.waves) {
    const deps = w.dependsOn.length ? ` (after: ${w.dependsOn.join(", ")})` : "";
    console.log(`  [${w.index + 1}] ${w.waveId} — ${w.name}${deps}`);
  }
  console.log(`\nReceipt: ${RECEIPT_DIR}/mission.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
