import assert from "assert";
import { withApiHarness } from "../runtime/proofHarness";

async function testSafeArchitectureBlockerAutoApprovesToPlan() {
  await withApiHarness(async ({ requestJson }) => {
    const intake = await requestJson("POST", "/api/projects/intake", {
      name: "Autopilot Safe Project",
      request: "Build an internal operations dashboard with role-based access and reporting.",
    });

    assert.strictEqual(intake.status, 200);
    const projectId = String(intake.body?.projectId || "");
    assert.ok(projectId, "project id must be returned");

    const compileStep = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(compileStep.status, 200);
    assert.strictEqual(compileStep.body?.route, "compile");
    assert.strictEqual(compileStep.body?.status, "awaiting_architecture_approval");

    const planStep = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(planStep.status, 200);
    assert.strictEqual(planStep.body?.route, "plan");
    assert.strictEqual(planStep.body?.actionResult?.autoApproval, true);
    assert.strictEqual(planStep.body?.status, "queued");

    const status = await requestJson("GET", `/api/projects/${projectId}/status`);
    assert.strictEqual(status.status, 200);
    assert.strictEqual(status.body?.status, "queued");
  });
}

async function testHighRiskDecisionRemainsBlocked() {
  await withApiHarness(async ({ requestJson }) => {
    const intake = await requestJson("POST", "/api/projects/intake", {
      name: "Autopilot High Risk Project",
      request: "Build and deploy to production a Stripe-powered payments app with live subscriptions.",
    });

    assert.strictEqual(intake.status, 200);
    const projectId = String(intake.body?.projectId || "");
    assert.ok(projectId, "project id must be returned");

    const compileStep = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(compileStep.status, 200);
    assert.strictEqual(compileStep.body?.route, "compile");

    const blockedStep = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
      message: "continue",
    });
    assert.strictEqual(blockedStep.status, 200);
    assert.strictEqual(blockedStep.body?.route, "build_blocked");
  });
}

async function run() {
  await testSafeArchitectureBlockerAutoApprovesToPlan();
  await testHighRiskDecisionRemainsBlocked();
  console.log("operatorApprovalPolicyFlow.test.ts passed");
}

void run();
