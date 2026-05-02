import fs from "fs";
import path from "path";
import { withApiHarness } from "./proofHarness";

type ContractArtifact = {
  generatedAt: string;
  status: "passed" | "failed";
  intakeSubmitMutationPassed: boolean;
  promptSubmitMutationPassed: boolean;
  suggestionSubmitMutationPassed: boolean;
  projectCreationMutationPassed: boolean;
  backend500sResolved: boolean;
  payloadSchemaValidated: boolean;
  e2eOwnerLaunchCoversRealMutation: boolean;
  criticalFailures: number;
  details: Array<{ step: string; status: number; ok: boolean; note: string }>;
};

async function run() {
  const runtimeDir = path.join(process.cwd(), "release-evidence", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const artifact = await withApiHarness(async ({ requestJson }) => {
    const details: Array<{ step: string; status: number; ok: boolean; note: string }> = [];

    const intakeOk = await requestJson("POST", "/api/projects/intake", {
      name: "Mutation Contract Project",
      request: "Build a project with real mutation coverage.",
    });
    const projectId = String(intakeOk.body?.projectId || "");
    details.push({ step: "create_project", status: intakeOk.status, ok: intakeOk.status === 200 && Boolean(projectId), note: `projectId=${projectId || "missing"}` });

    const intakeBad = await requestJson("POST", "/api/projects/intake", {
      name: "Invalid Missing Request",
    });
    const payloadSchemaValidated = intakeBad.status === 400 && String(intakeBad.body?.code || "") === "INTAKE_REQUEST_REQUIRED";
    details.push({ step: "intake_missing_request", status: intakeBad.status, ok: payloadSchemaValidated, note: `code=${String(intakeBad.body?.code || "none")}` });

    let promptSubmitMutationPassed = false;
    let suggestionSubmitMutationPassed = false;
    let projectCreationMutationPassed = intakeOk.status === 200 && Boolean(projectId);

    if (projectId) {
      const statusBefore = await requestJson("GET", `/api/projects/${projectId}/status`);
      details.push({ step: "status_before_prompt", status: statusBefore.status, ok: statusBefore.status === 200, note: `projectStatus=${String(statusBefore.body?.status || "unknown")}` });

      const promptSubmit = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
        message: "Add a concise hero section with trust badges",
      });
      promptSubmitMutationPassed = promptSubmit.status === 200;
      details.push({ step: "prompt_submit", status: promptSubmit.status, ok: promptSubmitMutationPassed, note: `route=${String(promptSubmit.body?.route || "unknown")}` });

      const suggestionSubmit = await requestJson("POST", `/api/projects/${projectId}/operator/send`, {
        message: "Improve mobile view",
      });
      suggestionSubmitMutationPassed = suggestionSubmit.status === 200;
      details.push({ step: "suggestion_submit", status: suggestionSubmit.status, ok: suggestionSubmitMutationPassed, note: `route=${String(suggestionSubmit.body?.route || "unknown")}` });

      const invalidProjectPrompt = await requestJson("POST", "/api/projects/proj_missing_mutation/operator/send", {
        message: "test",
      });
      details.push({ step: "invalid_project_prompt", status: invalidProjectPrompt.status, ok: invalidProjectPrompt.status === 404, note: String(invalidProjectPrompt.body?.error || "") });

      const statusAfter = await requestJson("GET", `/api/projects/${projectId}/status`);
      const runsAfter = statusAfter.status === 200 ? Object.keys((statusAfter.body?.runs || {}) as Record<string, unknown>).length : 0;
      details.push({ step: "status_after_prompt", status: statusAfter.status, ok: statusAfter.status === 200 && runsAfter > 0, note: `runCount=${runsAfter}` });

      projectCreationMutationPassed = projectCreationMutationPassed && statusBefore.status === 200 && statusAfter.status === 200;
    }

    const backend500sResolved = details.every((item) => item.status < 500);

    const e2eSpecPath = path.join(process.cwd(), "tests", "e2e", "beta-owner-launch.spec.ts");
    const e2eSpec = fs.existsSync(e2eSpecPath) ? fs.readFileSync(e2eSpecPath, "utf8") : "";
    const e2eOwnerLaunchCoversRealMutation =
      e2eSpec.includes("promptInput.press(\"Enter\")") &&
      e2eSpec.includes("/operator/send") &&
      e2eSpec.includes("suggestionChip.click()") &&
      e2eSpec.includes("actionChip.click()");

    const intakeSubmitMutationPassed = intakeOk.status === 200;

    const contract: ContractArtifact = {
      generatedAt: new Date().toISOString(),
      status:
        intakeSubmitMutationPassed &&
        promptSubmitMutationPassed &&
        suggestionSubmitMutationPassed &&
        projectCreationMutationPassed &&
        backend500sResolved &&
        payloadSchemaValidated &&
        e2eOwnerLaunchCoversRealMutation
          ? "passed"
          : "failed",
      intakeSubmitMutationPassed,
      promptSubmitMutationPassed,
      suggestionSubmitMutationPassed,
      projectCreationMutationPassed,
      backend500sResolved,
      payloadSchemaValidated,
      e2eOwnerLaunchCoversRealMutation,
      criticalFailures: 0,
      details,
    };

    contract.criticalFailures = [
      contract.intakeSubmitMutationPassed,
      contract.promptSubmitMutationPassed,
      contract.suggestionSubmitMutationPassed,
      contract.projectCreationMutationPassed,
      contract.backend500sResolved,
      contract.payloadSchemaValidated,
      contract.e2eOwnerLaunchCoversRealMutation,
    ].filter((ok) => !ok).length;

    return contract;
  });

  const outPath = path.join(runtimeDir, "intake_project_mutation_contract_proof.json");
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`Intake/project mutation contract proof written: status=${artifact.status} criticalFailures=${artifact.criticalFailures}`);
  if (artifact.status !== "passed") process.exit(1);
}

void run();
