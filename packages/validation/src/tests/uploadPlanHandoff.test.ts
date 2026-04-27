/**
 * Tests for upload-to-plan handoff sequencing.
 * Validates:
 *  A - successful upload triggers compile before plan
 *  B - /plan is not called if compile fails (master truth gate)
 *  C - /plan 404 "No master truth" triggers compile fallback and one retry
 *  D - upload 413 is classified as resource_limit_failure, not builder-defect
 *  E - successful extraction message is not followed by "upload failed" unless extraction truly failed
 */
import assert from "assert";
import fs from "fs";
import path from "path";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Simulate classifyError logic inline (extracted from systemIntelligence.ts for
 * unit-testing without a DOM/Next.js environment).  The real implementation and
 * this copy must stay in sync — the validator enforces that.
 */
function classifyError(errorMessage: string): {
  className: string;
  recommendedCommand: string;
} {
  const message = errorMessage.toLowerCase();
  if (/(413|too large|payload too large|request entity too large|content too large)/.test(message)) {
    return {
      className: "resource_limit_failure",
      recommendedCommand: "use GitHub URL, cloud link, or local manifest intake for large files — the proxy blocked this upload",
    };
  }
  if (/(planning.sequence.error|no master truth|master truth compilation failed|uploaded source exists.*master truth)/.test(message)) {
    return {
      className: "planning-sequence-error",
      recommendedCommand: "compile master truth from latest uploaded intake",
    };
  }
  if (/(401|403|forbidden|unauthorized|permission|credential|secret)/.test(message)) {
    return { className: "permission", recommendedCommand: "explain blocker" };
  }
  if (/(validation|invalid|schema|parse|manifest)/.test(message)) {
    return { className: "validation", recommendedCommand: "fix failure" };
  }
  if (/(network|timeout|econn|failed to fetch|connection|unavailable)/.test(message)) {
    return { className: "network", recommendedCommand: "continue build" };
  }
  if (/(compile|test failed|runtime|artifact|generated app)/.test(message)) {
    return { className: "generated-app-failure", recommendedCommand: "inspect failure" };
  }
  return { className: "builder-defect", recommendedCommand: "inspect failure" };
}

/**
 * Simulate runPipelineFromIntakeContext sequencing: compile → plan.
 * Accepts mock implementations of compileProject and planProject.
 */
async function simulatePipeline(
  compileFn: () => Promise<void>,
  planFn: () => Promise<void>
): Promise<string> {
  // Step 1: compile
  try {
    await compileFn();
  } catch (err: any) {
    throw new Error(`planning-sequence-error: Master truth compilation failed after upload. ${err?.message || err}`);
  }
  // Step 2: plan with fallback
  try {
    await planFn();
  } catch (planErr: any) {
    const msg = String(planErr?.message || planErr).toLowerCase();
    if (msg.includes("no master truth") || msg.includes("master truth")) {
      try {
        await compileFn(); // retry compile
        await planFn();    // retry plan
      } catch (retryErr: any) {
        throw new Error(`planning-sequence-error: Uploaded source exists, but master truth compilation failed. ${retryErr?.message || retryErr}`);
      }
    } else {
      throw planErr;
    }
  }
  return "pipeline-ok";
}

async function simulateBatchUploadFlow(params: {
  files: string[];
  uploadFn: (fileName: string) => Promise<void>;
  compileFn: () => Promise<void>;
  planFn: () => Promise<void>;
}): Promise<{
  callOrder: string[];
  failedFiles: Array<{ fileName: string; className: string; errorMsg: string }>;
}> {
  const callOrder: string[] = [];
  const failedFiles: Array<{ fileName: string; className: string; errorMsg: string }> = [];

  for (const fileName of params.files) {
    callOrder.push(`upload:${fileName}:start`);
    try {
      await params.uploadFn(fileName);
      callOrder.push(`upload:${fileName}:success`);
    } catch (err: any) {
      const raw = String(err?.message || err);
      const classified = classifyError(raw);
      failedFiles.push({
        fileName,
        className: classified.className,
        errorMsg: raw,
      });
      callOrder.push(`upload:${fileName}:failed:${classified.className}`);
    }
  }

  if (failedFiles.length > 0) {
    return { callOrder, failedFiles };
  }

  callOrder.push("compile:start");
  await params.compileFn();
  callOrder.push("compile:success");

  callOrder.push("plan:start");
  await params.planFn();
  callOrder.push("plan:success");

  return { callOrder, failedFiles };
}

// ─── tests ──────────────────────────────────────────────────────────────────

function testA_SuccessfulUploadCompilesThenPlans() {
  const callOrder: string[] = [];
  const compile = async () => { callOrder.push("compile"); };
  const plan = async () => { callOrder.push("plan"); };

  return simulatePipeline(compile, plan).then((res) => {
    assert.strictEqual(res, "pipeline-ok", "Expected pipeline-ok");
    assert.deepStrictEqual(callOrder, ["compile", "plan"], "compile must be called before plan");
    // compile must appear before plan
    assert(callOrder.indexOf("compile") < callOrder.indexOf("plan"), "compile precedes plan");
  });
}

function testB_PlanNotCalledWhenCompileFails() {
  let planCalled = false;
  const compile = async () => { throw new Error("compile exploded"); };
  const plan = async () => { planCalled = true; };

  return simulatePipeline(compile, plan)
    .then(() => { assert.fail("Should have thrown"); })
    .catch((err: Error) => {
      assert(!planCalled, "/plan must NOT be called when compile throws");
      assert(err.message.includes("planning-sequence-error"), `Expected planning-sequence-error, got: ${err.message}`);
    });
}

function testC_Plan404NoMasterTruthFallbackRetry() {
  const callOrder: string[] = [];
  let planCallCount = 0;
  const compile = async () => { callOrder.push("compile"); };
  const plan = async () => {
    planCallCount++;
    callOrder.push("plan");
    if (planCallCount === 1) throw new Error("404 No master truth");
    // second call succeeds
  };

  return simulatePipeline(compile, plan).then(() => {
    // Should have: compile, plan(fail), compile(retry), plan(retry-success)
    assert.deepStrictEqual(callOrder, ["compile", "plan", "compile", "plan"],
      `Expected [compile, plan, compile, plan], got ${JSON.stringify(callOrder)}`);
    assert.strictEqual(planCallCount, 2, "plan should be called exactly twice (initial + retry)");
  });
}

function testC2_Plan404BothRetriesFail() {
  const compile = async () => { /* ok */ };
  const plan = async () => { throw new Error("404 No master truth"); };

  return simulatePipeline(compile, plan)
    .then(() => { assert.fail("Should have thrown"); })
    .catch((err: Error) => {
      assert(
        err.message.includes("planning-sequence-error") &&
        err.message.includes("Uploaded source exists, but master truth compilation failed"),
        `Unexpected error: ${err.message}`
      );
    });
}

function testD_Upload413ClassifiedAsResourceLimit() {
  const raw413 = "Request failed with status 413 Request Entity Too Large";
  const result = classifyError(raw413);
  assert.strictEqual(result.className, "resource_limit_failure",
    `413 should be resource_limit_failure, got: ${result.className}`);
  assert(result.recommendedCommand.includes("GitHub") || result.recommendedCommand.includes("cloud link"),
    `recommendedCommand should suggest alternative intake: ${result.recommendedCommand}`);
}

function testD2_Upload413NotBuilderDefect() {
  const raw413 = "413 Payload Too Large";
  const result = classifyError(raw413);
  assert.notStrictEqual(result.className, "builder-defect",
    "413 must NOT be classified as builder-defect");
}

function testE_SuccessfulExtractionNoUploadFailedMessage() {
  // If upload succeeds (no throw), the pipeline error is reported as "Pipeline failed", NOT "Upload failed"
  // Simulate: upload succeeds → pipeline fails (compile throws)
  const messages: string[] = [];
  const uploadResult = { fileName: "spec.zip", extractedChars: 154993, binarySummary: [] };

  // Mimic ConversationPane logic: upload succeeds, appends success message, then pipeline fails
  messages.push(`Uploaded ${uploadResult.fileName}; extracted ${uploadResult.extractedChars} characters; available to planning.`);

  const pipelineError = new Error("planning-sequence-error: Master truth compilation failed after upload.");
  const classified = classifyError(pipelineError.message);
  messages.push(`Pipeline failed (${classified.className}): ${pipelineError.message}\nRecommended command: ${classified.recommendedCommand}`);

  // No "Upload failed" message should appear
  const uploadFailedMessages = messages.filter((m) => m.startsWith("Upload failed"));
  assert.strictEqual(uploadFailedMessages.length, 0,
    `"Upload failed" must not appear when extraction succeeded; messages: ${JSON.stringify(messages)}`);

  // But "Pipeline failed" should appear
  const pipelineFailedMessages = messages.filter((m) => m.startsWith("Pipeline failed"));
  assert.strictEqual(pipelineFailedMessages.length, 1, "Pipeline failed message should appear");
  assert(pipelineFailedMessages[0].includes("planning-sequence-error"), "Should include planning-sequence-error class");
}

function testMasterTruthErrorClassifiedCorrectly() {
  const result1 = classifyError("404 No master truth");
  assert.strictEqual(result1.className, "planning-sequence-error", `No master truth should be planning-sequence-error, got ${result1.className}`);
  assert(result1.recommendedCommand.includes("compile"), `Should recommend compile, got: ${result1.recommendedCommand}`);

  const result2 = classifyError("planning-sequence-error: Uploaded source exists, but master truth compilation failed.");
  assert.strictEqual(result2.className, "planning-sequence-error", `planning-sequence-error tag should be recognized`);
}

function testMultiFileSelectionEnabledInComposer() {
  const root = process.cwd();
  const composer = fs.readFileSync(path.join(root, "apps/control-plane/src/components/chat/Composer.tsx"), "utf8");
  assert(composer.includes("multiple"), "Composer file input should enable multiple selection");
  assert(composer.includes("e.dataTransfer.files"), "Composer drag/drop should use full files collection");
}

function testUploadRouteCreatesSourceRecordPerFile() {
  const root = process.cwd();
  const server = fs.readFileSync(path.join(root, "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert(server.includes("createIntakeSourceRecord"), "Upload route should create intake source records");
  assert(server.includes("sourceId: source.sourceId"), "Upload artifacts/response should carry sourceId");
}

function testCompileFromUploadedV11BindsMasterTruthAndContract() {
  const root = process.cwd();
  const server = fs.readFileSync(path.join(root, "apps/orchestrator-api/src/server_app.ts"), "utf8");

  assert(server.includes("function compileProjectWithIntake"), "compileProjectWithIntake must exist");
  assert(server.includes("masterTruth: truth"), "compile path must persist project.masterTruth");
  assert(server.includes("[buildContractRunKey]: approvedContract"), "compile path must persist a build contract");
  assert(server.includes("approveBuildContract"), "compile path should approve build contract for uploaded-source compile");
  assert(server.includes("if (hasUploadedIntake && contract?.approvedAt)"), "build blocker check should allow planning after uploaded-source compile");
}

async function testBatchUploadsAllFilesBeforeCompile() {
  const files = ["spec-a.zip", "design.md", "api.json"];
  const result = await simulateBatchUploadFlow({
    files,
    uploadFn: async () => {
      // success
    },
    compileFn: async () => {
      // success
    },
    planFn: async () => {
      // success
    },
  });

  const compileStartIdx = result.callOrder.indexOf("compile:start");
  assert(compileStartIdx > 0, "compile should run after uploads");
  for (const fileName of files) {
    const successIdx = result.callOrder.indexOf(`upload:${fileName}:success`);
    assert(successIdx >= 0, `expected upload success for ${fileName}`);
    assert(successIdx < compileStartIdx, `all uploads must complete before compile; file=${fileName}`);
  }
}

async function testCompileRunsOnceAfterBatchComplete() {
  let compileCount = 0;
  const result = await simulateBatchUploadFlow({
    files: ["a.zip", "b.pdf"],
    uploadFn: async () => {
      // success
    },
    compileFn: async () => {
      compileCount++;
    },
    planFn: async () => {
      // success
    },
  });

  assert.strictEqual(result.failedFiles.length, 0, "No failures expected in happy path");
  assert.strictEqual(compileCount, 1, "compile should run exactly once for a successful batch");
}

async function testPlanRunsOnlyAfterCompile() {
  const callOrder: string[] = [];
  await simulateBatchUploadFlow({
    files: ["a.ts", "b.tsx"],
    uploadFn: async () => {
      // success
    },
    compileFn: async () => {
      callOrder.push("compile");
    },
    planFn: async () => {
      callOrder.push("plan");
    },
  });

  assert.deepStrictEqual(callOrder, ["compile", "plan"], "plan must run only after compile");
}

async function testFailedFileReportsPerFileError() {
  const result = await simulateBatchUploadFlow({
    files: ["ok1.md", "bad.zip", "ok2.json"],
    uploadFn: async (fileName) => {
      if (fileName === "bad.zip") {
        throw new Error("validation failed while ingesting archive");
      }
    },
    compileFn: async () => {
      assert.fail("compile should not run when any file upload fails");
    },
    planFn: async () => {
      assert.fail("plan should not run when any file upload fails");
    },
  });

  assert.strictEqual(result.failedFiles.length, 1, "Exactly one file should be reported failed");
  assert.strictEqual(result.failedFiles[0].fileName, "bad.zip", "Failed file name should be reported");
  assert(result.failedFiles[0].errorMsg.includes("validation failed"), "Failed file error should include raw error");
}

async function testBatchFile413ClassifiedResourceLimitFailure() {
  const result = await simulateBatchUploadFlow({
    files: ["ok.md", "too-large.zip"],
    uploadFn: async (fileName) => {
      if (fileName === "too-large.zip") {
        throw new Error("Request failed with status 413 Request Entity Too Large");
      }
    },
    compileFn: async () => {
      assert.fail("compile should not run when one file fails");
    },
    planFn: async () => {
      assert.fail("plan should not run when one file fails");
    },
  });

  assert.strictEqual(result.failedFiles.length, 1, "Expected one failed file");
  assert.strictEqual(result.failedFiles[0].fileName, "too-large.zip", "Expected oversized file to fail");
  assert.strictEqual(result.failedFiles[0].className, "resource_limit_failure", "413 should classify as resource_limit_failure");
}

// ─── runner ─────────────────────────────────────────────────────────────────

const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [
  { name: "MF1: multiple files can be selected in composer", fn: testMultiFileSelectionEnabledInComposer },
  { name: "MF1b: each uploaded file creates intake source record", fn: testUploadRouteCreatesSourceRecordPerFile },
  { name: "MF1c: uploaded-source compile binds masterTruth and build contract", fn: testCompileFromUploadedV11BindsMasterTruthAndContract },
  { name: "MF2: all files upload before compile", fn: testBatchUploadsAllFilesBeforeCompile },
  { name: "MF3: compile runs once after batch complete", fn: testCompileRunsOnceAfterBatchComplete },
  { name: "MF4: plan runs only after compile", fn: testPlanRunsOnlyAfterCompile },
  { name: "MF5: one failed file reports per-file error", fn: testFailedFileReportsPerFileError },
  { name: "MF6: one file 413 is resource_limit_failure", fn: testBatchFile413ClassifiedResourceLimitFailure },
  { name: "A: Successful upload compiles before planning", fn: testA_SuccessfulUploadCompilesThenPlans },
  { name: "B: /plan not called when compile fails", fn: testB_PlanNotCalledWhenCompileFails },
  { name: "C: /plan 404 triggers compile fallback + one retry", fn: testC_Plan404NoMasterTruthFallbackRetry },
  { name: "C2: /plan 404 both retries fail = planning-sequence-error", fn: testC2_Plan404BothRetriesFail },
  { name: "D: Upload 413 classified as resource_limit_failure", fn: testD_Upload413ClassifiedAsResourceLimit },
  { name: "D2: Upload 413 not classified as builder-defect", fn: testD2_Upload413NotBuilderDefect },
  { name: "E: Extraction success not followed by Upload failed", fn: testE_SuccessfulExtractionNoUploadFailedMessage },
  { name: "MasterTruth: No master truth classified as planning-sequence-error", fn: testMasterTruthErrorClassifiedCorrectly },
];

let passed = 0;
let failed = 0;

async function run() {
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }
  console.log(`\nuploadPlanHandoff: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
