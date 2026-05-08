import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const proofTiers = {
  baseline: [
    "proof:domain-scorecards",
    "proof:eval-suite",
    "proof:multi-domain-emitted-output",
    "proof:domain-runtime-commands",
    "proof:secrets-credential-management",
    "proof:autonomous-complex-build",
    "proof:adaptive-repair-strategy",
    "proof:large-file-intake",
    "proof:multi-source-intake",
  ],
  commercial: [
    "proof:greenfield",
    "proof:dirty-repo",
    "proof:self-upgrade",
    "proof:universal-pipeline",
    "proof:deployment-dry-run",
    "proof:external-deployment-readiness",
    "proof:credentialed-deployment-readiness",
    "proof:live-deployment-execution-readiness",
    "proof:live-ui-source-sync-before-export-launch",
    "proof:live-deployment-provider-execution",
  ],
  maxPower: [
    "proof:max-power-domain-permutations",
    "proof:autobuild-99-statistical",
    "proof:claim-99-independent-audit",
    "proof:claim-99-entitlement",
    "proof:max-power-completion",
  ],
} as const;

type ProofTier = keyof typeof proofTiers | "all";
type ProofResult = {
  script: string;
  status: number;
  logPath: string;
};

function getTier(): ProofTier {
  const raw = process.argv[2] || "all";
  if (raw === "baseline" || raw === "commercial" || raw === "maxPower" || raw === "all") return raw;
  throw new Error(`Unsupported proof tier: ${raw}`);
}

function getProofs(tier: ProofTier): string[] {
  if (tier === "all") {
    return [...proofTiers.baseline, ...proofTiers.commercial, ...proofTiers.maxPower];
  }
  return [...proofTiers[tier]];
}

function safeName(script: string): string {
  return script.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function tail(output: string, lines = 80): string {
  return output.split(/\r?\n/).slice(-lines).join("\n");
}

function run() {
  const tier = getTier();
  const proofs = getProofs(tier);
  const evidenceDir = path.join(process.cwd(), "audit", "baseline", "logs", `proof-${tier}`);
  ensureDir(evidenceDir);

  const results: ProofResult[] = [];

  console.log(`Running proof tier: ${tier}`);
  console.log(`Proof count: ${proofs.length}`);

  for (const script of proofs) {
    const name = safeName(script);
    const logPath = path.join(evidenceDir, `${name}.log`);
    const exitPath = path.join(evidenceDir, `${name}.exit`);

    console.log(`\n=== Running ${script} ===`);

    const result = spawnSync("npm", ["run", "-s", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env },
    });

    const status = result.status ?? 1;
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const output = `${stdout}${stderr ? `\n${stderr}` : ""}`;

    fs.writeFileSync(logPath, output);
    fs.writeFileSync(exitPath, `${status}\n`);

    if (output.trim()) console.log(tail(output));
    console.log(`${script}: ${status === 0 ? "PASS" : "FAIL"}`);

    results.push({ script, status, logPath });
  }

  const summaryPath = path.join(evidenceDir, "summary.txt");
  const summary = results
    .map((result) => `${result.status === 0 ? "PASS" : "FAIL"}\t${result.script}\t${result.logPath}`)
    .join("\n");
  fs.writeFileSync(summaryPath, `${summary}\n`);

  console.log(`\n=== proof:${tier} summary ===`);
  console.log(summary);

  const failed = results.filter((result) => result.status !== 0);
  if (failed.length > 0) {
    console.error("\nFailing child proofs:");
    for (const result of failed) {
      console.error(`- ${result.script} (exit ${result.status}) log=${result.logPath}`);
    }
    process.exit(1);
  }

  console.log(`All ${tier} proof harnesses passed.`);
}

run();
