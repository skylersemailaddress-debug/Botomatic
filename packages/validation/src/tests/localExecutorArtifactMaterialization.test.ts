import assert from "assert";
import fs from "fs";
import path from "path";
import { withApiHarness } from "../runtime/proofHarness";
import { classifyLocalExecutionOutcome } from "../../../../apps/orchestrator-api/src/server_app";

async function pollRuntime(
  requestJson: (method: string, routePath: string, body?: unknown) => Promise<{ status: number; body: any }>,
  projectId: string,
  timeoutMs = 120000
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const runtime = await requestJson("GET", `/api/projects/${projectId}/runtime`);
    if (runtime.status === 200) {
      return runtime;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for local runtime artifact");
}

async function testLocalExecutionMaterializesWorkspace() {
  await withApiHarness(async ({ requestJson }) => {
    const intake = await requestJson("POST", "/api/projects/intake", {
      name: "Local Executor Materialization",
      request: "Build a landing page app with local runtime proof and unsupported integration blockers.",
    });

    assert.strictEqual(intake.status, 200);
    const projectId = String(intake.body?.projectId || "");
    assert.ok(projectId, "project id must be returned");

    const analyzed = await requestJson("POST", `/api/projects/${projectId}/spec/analyze`, {
      message: "Build a landing page app with local runtime proof and unsupported integration blockers.",
    });
    assert.strictEqual(analyzed.status, 200);

    const contract = await requestJson("POST", `/api/projects/${projectId}/spec/build-contract`, {});
    assert.strictEqual(contract.status, 200);

    const compile = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(compile.status, 200);
    assert.strictEqual(compile.body?.route, "compile");

    const plan = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(plan.status, 200);
    assert.strictEqual(plan.body?.route, "plan");

    const execute = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(execute.status, 200);
    assert.strictEqual(execute.body?.route, "execute_next");

    const runtime = await pollRuntime(requestJson, projectId);

    const generatedProjectPath = String(runtime.body?.generatedProjectPath || "");
    assert.ok(generatedProjectPath.length > 0, "generatedProjectPath should be populated");
    assert.ok(fs.existsSync(generatedProjectPath), "generated workspace path should exist");

    const requiredFiles = [
      "package.json",
      "README.md",
      "src/index.html",
      "src/components/Hero.tsx",
      "scripts/build.mjs",
      "server.mjs",
    ];
    for (const rel of requiredFiles) {
      assert.ok(fs.existsSync(path.join(generatedProjectPath, rel)), `required generated file missing: ${rel}`);
    }

    assert.strictEqual(runtime.body?.buildStatus, "passed", "generated app build must pass");
    assert.strictEqual(runtime.body?.runStatus, "passed", "generated app run must pass");
    assert.strictEqual(runtime.body?.smokeStatus, "passed", "generated app smoke must pass");

    const execution = await requestJson("GET", `/api/projects/${projectId}/execution`);
    assert.strictEqual(execution.status, 200, "execution payload should be available after local execution");
    const jobs = execution.body?.jobs || [];
    assert.ok(jobs.length > 0, "at least one local execution job should exist");
    const latestJob = jobs[0];
    assert.strictEqual(latestJob?.classification, "PASS_REAL", "local execution should produce PASS_REAL when build/run/smoke pass");
  });
}

function testMissingWorkspaceClassifiesFailBuilder() {
  const classification = classifyLocalExecutionOutcome({
    filesWritten: 0,
    buildStatus: "not_started",
    runStatus: "not_started",
    smokeStatus: "not_started",
  });
  assert.strictEqual(classification, "FAIL_BUILDER");
}

async function run() {
  await testLocalExecutionMaterializesWorkspace();
  testMissingWorkspaceClassifiesFailBuilder();
  console.log("localExecutorArtifactMaterialization.test.ts passed");
}

void run();
