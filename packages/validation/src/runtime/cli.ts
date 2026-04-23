import fs from "fs";
import path from "path";
import { runGateNegativePathSuite } from "./gateNegativePaths";
import { summarizeRuntimeSuite } from "./types";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

async function run() {
  const enabled = process.env.BOTOMATIC_BEHAVIORAL_VALIDATE === "1";
  if (!enabled) {
    console.log("Behavioral validation skipped (set BOTOMATIC_BEHAVIORAL_VALIDATE=1 to enable)");
    return;
  }

  const baseUrl = requiredEnv("BOTOMATIC_BASE_URL");
  const issuer = requiredEnv("BOTOMATIC_OIDC_ISSUER");
  const audience = requiredEnv("BOTOMATIC_OIDC_AUDIENCE");
  const privateKeyPath = requiredEnv("BOTOMATIC_OIDC_PRIVATE_KEY_PATH");
  const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");

  const suite = await runGateNegativePathSuite({
    baseUrl,
    issuer,
    audience,
    privateKeyPem,
  });

  const summary = summarizeRuntimeSuite(suite);
  const payload = {
    generatedAt: new Date().toISOString(),
    proofGrade: "local_runtime",
    suite,
    summary,
  };

  const outDir = path.join(process.cwd(), "release-evidence", "runtime");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "gate_negative_paths.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`Behavioral validation written: ${outPath}`);
  console.log(`passed=${summary.passed} failed=${summary.failed} skipped=${summary.skipped}`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(String((error as any)?.message || error));
  process.exit(1);
});
