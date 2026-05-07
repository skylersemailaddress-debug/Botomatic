import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";

import { type GeneratedAppEvidenceBundle } from "../evidenceBundle";
import { type GeneratedAppReleaseContract } from "../releaseContract";
import { validateGeneratedAppEvidenceBundle } from "../validateEvidenceBundle";
import { validateGeneratedAppReleaseContract } from "../validateReleaseContract";
import { validateGeneratedAppRuntimeSmoke } from "../validateRuntimeSmoke";

function withFixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "generated-app-release-contract-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const filePath = path.join(root, rel);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

withFixture(
  {
    "README.md": "# App\nnot launch-ready\n",
    ".env.example": "API_KEY=replace_at_runtime\n",
  },
  (root) => {
    const contract: GeneratedAppReleaseContract = {
      appId: "consumerApp",
      version: "1.0.0",
      sourceTreePath: "src",
      readme: "README.md",
      installInstructions: "npm install",
      envExample: ".env.example",
      buildCommand: "npm run build",
      testCommand: "npm test",
      lintTypecheckCommand: "npm run typecheck",
      runtimeSmokeCommand: "curl -f http://localhost:3000/health",
      deploymentPlan: "deploy notes",
      rollbackPlan: "rollback notes",
      securityNotes: "security notes",
      knownLimitations: "known limitations",
      evidenceManifest: "generated-app-evidence.json",
      isDemo: false,
      claimBoundary: "This package is not launch-ready until runtime validation is complete.",
    };

    const result = validateGeneratedAppReleaseContract(contract, root);
    assert.equal(result.passed, true);
  }
);

withFixture(
  {
    "README.md": "# App\nnot launch-ready\n",
    ".env.example": "API_KEY=replace_at_runtime\n",
  },
  (root) => {
    const contract: GeneratedAppReleaseContract = {
      appId: "consumerApp",
      version: "1.0.0",
      sourceTreePath: "src",
      readme: "README.md",
      installInstructions: "npm install",
      envExample: ".env.example",
      buildCommand: "",
      testCommand: "npm test",
      runtimeSmokeCommand: "curl -f http://localhost:3000/health",
      deploymentPlan: "deploy notes",
      rollbackPlan: "rollback notes",
      securityNotes: "security notes",
      knownLimitations: "known limitations",
      evidenceManifest: "generated-app-evidence.json",
      isDemo: false,
      claimBoundary: "This package is not launch-ready until runtime validation is complete.",
    };

    const result = validateGeneratedAppReleaseContract(contract, root);
    assert.equal(result.passed, false);
    assert.ok(result.findings.some((finding) => finding.field === "buildCommand" && (finding.severity === "critical" || finding.severity === "high")));
  }
);

withFixture(
  {
    "README.md": "# App\nnot launch-ready\n",
    ".env.example": "API_KEY=replace_at_runtime\n",
  },
  (root) => {
    const contract: GeneratedAppReleaseContract = {
      appId: "consumerApp",
      version: "1.0.0",
      sourceTreePath: "src",
      readme: "README.md",
      installInstructions: "npm install",
      envExample: ".env.example",
      buildCommand: "npm run build",
      testCommand: "npm test",
      runtimeSmokeCommand: "curl -f http://localhost:3000/health",
      deploymentPlan: "deploy notes",
      rollbackPlan: "rollback notes",
      securityNotes: "security notes",
      knownLimitations: "known limitations",
      evidenceManifest: "generated-app-evidence.json",
      isDemo: false,
      claimBoundary: "Readiness notes only.",
    };

    const result = validateGeneratedAppReleaseContract(contract, root);
    assert.equal(result.passed, false);
    assert.ok(result.findings.some((finding) => finding.field === "claimBoundary"));
  }
);

const staticBundle: GeneratedAppEvidenceBundle = {
  schemaVersion: "1",
  appId: "consumerApp",
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  npmVersion: "10.0.0",
  commandOutputs: {},
  checksums: [],
  passFail: {
    install: false,
    build: false,
    test: false,
    runtimeSmoke: false,
    noSecrets: false,
    noPlaceholders: false,
    dependencyAudit: false,
    accessibility: false,
  },
  overallPass: false,
  caveats: [
    "Evidence bundle records command outputs and timestamps only.",
    "Evidence bundle is not launch-readiness proof.",
  ],
};

{
  const result = validateGeneratedAppEvidenceBundle(staticBundle);
  assert.equal(result.passed, true);
}

{
  const invalidOverallBundle: GeneratedAppEvidenceBundle = {
    ...staticBundle,
    overallPass: true,
    passFail: {
      ...staticBundle.passFail,
      build: false,
      install: true,
      runtimeSmoke: true,
      noSecrets: true,
      noPlaceholders: true,
    },
  };

  const result = validateGeneratedAppEvidenceBundle(invalidOverallBundle);
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((finding) => finding.field === "passFail.build"));
}

{
  const result = validateGeneratedAppRuntimeSmoke({
    appId: "consumerApp",
    smokeCommand: "curl -f http://localhost:3000/health",
    expectedExitCode: 0,
    timeoutMs: 30000,
    notes: "Basic health smoke check.",
  });
  assert.equal(result.passed, true);
}

{
  const result = validateGeneratedAppRuntimeSmoke({
    appId: "consumerApp",
    smokeCommand: "example-smoke-command",
    expectedExitCode: 0,
    timeoutMs: 30000,
    notes: "Basic health smoke check.",
  });
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((finding) => finding.field === "smokeCommand"));
}

console.log("generatedAppReleaseContract.test.ts passed");
