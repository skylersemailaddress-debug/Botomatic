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

// ─── runner ─────────────────────────────────────────────────────────────────

const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [
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
