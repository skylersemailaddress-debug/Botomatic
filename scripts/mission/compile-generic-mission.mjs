#!/usr/bin/env node
/**
 * Compile a generic mission from a spec file or built-in fixture.
 * Usage: node compile-generic-mission.mjs [--spec <path>] [--fixture enterprise-saas|marketplace]
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
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    specFile: get("--spec"),
    fixture: get("--fixture") ?? "enterprise-saas",
  };
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(RECEIPT_DIR, { recursive: true });
  await fs.mkdir(path.join(RECEIPT_DIR, "checkpoints"), { recursive: true });

  const script = `
import { compileSpecToMission } from "./packages/mission-orchestrator/src/specToMissionCompiler.ts";
import { ENTERPRISE_SAAS_SPEC, ENTERPRISE_SAAS_PROJECT_ID } from "./packages/mission-orchestrator/src/fixtures/enterprise-saas.ts";
import { MARKETPLACE_SPEC, MARKETPLACE_PROJECT_ID } from "./packages/mission-orchestrator/src/fixtures/marketplace.ts";
import fs from "fs";

(async () => {
  const fixture = ${JSON.stringify(args.fixture)};
  const specFile = ${JSON.stringify(args.specFile)};

  let specText, projectId, sourceFile;
  if (specFile) {
    specText = fs.readFileSync(specFile, "utf8");
    projectId = "proj_custom_" + Date.now();
    sourceFile = specFile;
  } else if (fixture === "marketplace") {
    specText = MARKETPLACE_SPEC;
    projectId = MARKETPLACE_PROJECT_ID;
    sourceFile = "fixtures/marketplace.ts";
  } else {
    specText = ENTERPRISE_SAAS_SPEC;
    projectId = ENTERPRISE_SAAS_PROJECT_ID;
    sourceFile = "fixtures/enterprise-saas.ts";
  }

  const result = compileSpecToMission({ specText, sourceFile, projectId });
  process.stdout.write(JSON.stringify({ ...result, mission: result.mission }, null, 2));
})().catch(e => { process.stderr.write(String(e) + "\\n"); process.exit(1); });
`;

  const tmpScript = path.join(ROOT, ".tmp-compile-generic.ts");
  await fs.writeFile(tmpScript, script, "utf8");

  let result;
  try {
    const proc = spawnSync(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [tmpScript],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }
    );
    if (proc.status !== 0) {
      console.error("[compile-generic-mission] Error:", proc.stderr?.slice(0, 2000));
      process.exit(1);
    }
    result = JSON.parse(proc.stdout);
  } finally {
    await fs.unlink(tmpScript).catch(() => {});
  }

  // Save mission receipt
  await fs.writeFile(path.join(RECEIPT_DIR, "mission.json"), JSON.stringify(result.mission, null, 2), "utf8");

  // Save checkpoint for resume
  await fs.writeFile(
    path.join(RECEIPT_DIR, "checkpoints", "mission-checkpoint.json"),
    JSON.stringify(result.mission, null, 2),
    "utf8"
  );

  // Print summary
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     GENERIC MISSION COMPILED             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nMission ID:       ${result.mission.missionId}`);
  console.log(`Product type:     ${result.productType}`);
  console.log(`Architecture:     ${result.targetArchitecture}`);
  console.log(`Wave count:       ${result.waveCount}`);
  console.log(`Spec hash:        ${result.specHash.slice(0, 16)}...`);
  console.log(`\nWaves:`);
  for (const w of result.mission.waves) {
    console.log(`  [${w.index + 1}] ${w.waveId} — ${w.name} (${w.packets.length} packets)`);
  }
  console.log(`\n[compile-generic-mission] Receipt: ${path.join(RECEIPT_DIR, "mission.json")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
