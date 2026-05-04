#!/usr/bin/env node
/**
 * Compile the Nexus Canonical Master Build Spec into a deterministic Mission.
 * Writes receipts to receipts/mission/
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT_DIR = path.join(ROOT, "receipts", "mission");

// tsx-compatible dynamic import for TS modules
const require = createRequire(import.meta.url);

async function loadCompiler() {
  // Use tsx to transpile on the fly
  const { compileSpecToMission } = await import(
    `data:text/javascript,
    import { register } from "tsx/esm/api";
    register();
    const mod = await import("${path.join(ROOT, "packages/mission-orchestrator/src/specToMissionCompiler.ts")}");
    export const compileSpecToMission = mod.compileSpecToMission;
    `
  ).catch(() => null) ?? {};

  if (compileSpecToMission) return compileSpecToMission;

  // Fallback: spawn tsx
  return null;
}

async function main() {
  await fs.mkdir(RECEIPT_DIR, { recursive: true });

  // Check for local spec file first, then use embedded summary
  const specArgs = process.argv.slice(2);
  const specFileArg = specArgs.find((a) => !a.startsWith("--"));
  const projectId = process.argv.find((a) => a.startsWith("--project-id="))?.split("=")[1]
    ?? `nexus_${Date.now()}`;

  let specText = "";
  let sourceFile = "nexus-canonical-master-build-spec";

  if (specFileArg) {
    const specPath = path.resolve(process.cwd(), specFileArg);
    specText = await fs.readFile(specPath, "utf8");
    sourceFile = path.basename(specFileArg);
    console.log(`[compile-nexus-mission] Loaded spec from ${specPath} (${specText.length} chars)`);
  } else {
    // Use the canonical summary embedded in the receipts or a stub
    const cachedSpec = path.join(ROOT, "receipts", "mission", "nexus-spec-cache.txt");
    try {
      specText = await fs.readFile(cachedSpec, "utf8");
      console.log(`[compile-nexus-mission] Using cached spec (${specText.length} chars)`);
    } catch {
      // Minimal representative text that triggers all wave detectors
      specText = [
        "NEXUS CANONICAL MASTER BUILD SPEC",
        "Nexus is a unified synthetic-intelligence operating system and autonomous software factory.",
        "Includes: repo layout, monorepo scaffold, API contracts, data schema, database migrations,",
        "deterministic spec compiler, DAS, IBC, build contract, execution runtime, job queue, worker,",
        "builder engine, factory, blueprint registry, code generation, workspace materializer,",
        "repair engine, dirty repo completion, rollback, replay, truth engine, memory engine,",
        "9 memory classes, fact/belief/hypothesis, intelligence shell, command spine, operational focus pane,",
        "prediction surface, scenario lab, interventions, governance, RBAC, tenant isolation, secrets management,",
        "approval tiers, autonomy policy, deployment, rollback, export, Vercel adapter, dry-run,",
        "live deploy, validation system, proof ladder, claim boundary, evidence artifacts,",
        "fresh clone proof, end-to-end system launch ready.",
      ].join("\n");
      sourceFile = "nexus-canonical-master-build-spec-embedded";
      console.log(`[compile-nexus-mission] Using embedded spec summary`);
    }
  }

  // Run compiler via tsx subprocess to handle TypeScript
  const { spawnSync } = await import("child_process");

  const compilerScript = `
import { compileSpecToMission } from "./packages/mission-orchestrator/src/specToMissionCompiler.ts";
import fs from "fs";

const result = compileSpecToMission({
  specText: ${JSON.stringify(specText)},
  sourceFile: ${JSON.stringify(sourceFile)},
  projectId: ${JSON.stringify(projectId)},
});

process.stdout.write(JSON.stringify(result, null, 2));
`;

  const tmpScript = path.join(ROOT, ".tmp-compile-mission.ts");
  await fs.writeFile(tmpScript, compilerScript, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[compile-nexus-mission] Compiler error:", proc.stderr);
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  const { mission, sourceHash, specHash, waveCount } = result;

  // Write receipts
  const missionJson = path.join(RECEIPT_DIR, "nexus-mission.json");
  await fs.writeFile(missionJson, JSON.stringify(mission, null, 2), "utf8");

  const wavePlanCsv = [
    "index,waveId,name,dependsOn,packetCount,validators",
    ...mission.waves.map((w) =>
      `${w.index},${w.waveId},"${w.name}","${w.dependsOn.join("|")}",${w.packets.length},"${w.requiredValidators.join("|")}"`
    ),
  ].join("\n");
  await fs.writeFile(path.join(RECEIPT_DIR, "nexus-wave-plan.csv"), wavePlanCsv, "utf8");

  const missionMd = [
    `# Nexus Mission Receipt`,
    ``,
    `**Generated:** ${mission.compiledAt}`,
    `**Mission ID:** ${mission.missionId}`,
    `**Source:** ${mission.sourceFile}`,
    `**Source Hash:** ${sourceHash}`,
    `**Spec Hash:** ${specHash}`,
    `**Waves:** ${waveCount}`,
    `**Claim Level:** ${mission.claimLevel}`,
    ``,
    `## Waves`,
    ``,
    ...mission.waves.map((w) =>
      `### ${w.index + 1}. ${w.name}\n- ID: \`${w.waveId}\`\n- Depends on: ${w.dependsOn.length > 0 ? w.dependsOn.map((d) => `\`${d}\``).join(", ") : "none"}\n- Packets: ${w.packets.length}\n- Validators: ${w.requiredValidators.join(", ")}\n`
    ),
  ].join("\n");
  await fs.writeFile(path.join(RECEIPT_DIR, "nexus-mission.md"), missionMd, "utf8");

  console.log(`\n[compile-nexus-mission] Mission compiled successfully`);
  console.log(`  Mission ID:   ${mission.missionId}`);
  console.log(`  Source hash:  ${sourceHash}`);
  console.log(`  Spec hash:    ${specHash}`);
  console.log(`  Waves:        ${waveCount}`);
  console.log(`  Claim level:  ${mission.claimLevel}`);
  console.log(`  Receipt:      ${missionJson}`);

  // Print wave list
  console.log(`\nWave plan:`);
  for (const w of mission.waves) {
    const deps = w.dependsOn.length > 0 ? ` (after: ${w.dependsOn.join(", ")})` : "";
    console.log(`  [${w.index + 1}] ${w.waveId} — ${w.name}${deps}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
