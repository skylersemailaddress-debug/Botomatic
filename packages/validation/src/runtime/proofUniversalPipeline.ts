import { createProofEntry, verifyClaim } from "../../../../packages/proof-engine/src";
import { domainBuilderRegistry } from "../../../../packages/domain-builders/src/registry";
import {
  withApiHarness,
  writeProofArtifact,
  summarizeStepStatus,
  type ProofArtifact,
  type ValidatorRun,
} from "./proofHarness";

function domainRequestFor(id: string, name: string): string {
  const map: Record<string, string> = {
    web_apps: "Build a production web app with auth, workflow logic, integrations, tests, and deployment readiness.",
    websites: "Build a commercial website with forms, analytics, responsive UI, and deployment runbook.",
    saas_platforms: "Build a multi-tenant SaaS platform with RBAC, audit logs, billing, and launch packet.",
    mobile_apps: "Build a mobile app backend/control plane with auth, data model, workflows, and release checks.",
    desktop_apps: "Build a desktop app support system with auth, updates workflow, telemetry, and deployment docs.",
    browser_extensions: "Build a browser extension system with permissions model, API integration, and release checklist.",
    apis: "Build a production API service with auth, schema, workflows, tests, and deployment contract.",
    bots: "Build a bot platform with role permissions, integrations, observability, and launch packet.",
    ai_agents: "Build an AI agent orchestration app with tool permissions, approvals, and runtime evidence.",
    automations: "Build an automation workflow system with governance checks, retries, and deployment controls.",
    steam_pc_games: "Build a game operations platform with moderation workflows, telemetry, and release readiness.",
    roblox_games: "Build a Roblox game ops backend with admin controls, auditability, and deployment checklist.",
    unity_games: "Build a Unity game services platform with auth, economy workflows, notifications, and release gates.",
    unreal_games: "Build an Unreal game support platform with role controls, events workflow, and launch packet.",
    godot_games: "Build a Godot game operations app with telemetry, moderation workflows, and deployment proof.",
    minecraft_mods: "Build a Minecraft mod distribution platform with permissions, updates workflow, and release validation.",
    cli_tools: "Build a CLI tool product system with docs, validation, release workflow, and integration checks.",
    libraries_sdks: "Build an SDK product platform with versioning workflows, docs, tests, and publication readiness.",
    data_pipelines: "Build a data pipeline control platform with governance approvals, validation proof, and deployment runbook.",
  };
  return map[id] || `Build a production ${name} system with auth, workflows, validations, and launch readiness.`;
}

async function run() {
  const inputUsed = {
    appName: "Proof Universal Capability",
    request:
      "Build an AI-assisted operations platform with governed approvals, deep workflow orchestration, and launch packet generation from messy input.",
  };

  const artifact = await withApiHarness(async ({ requestJson }) => {
    const routeExercised: ProofArtifact["routeExercised"] = [];
    const executedSteps: ProofArtifact["executedSteps"] = [];
    const validatorsRun: ValidatorRun[] = [];

    const intake = await requestJson("POST", "/api/projects/intake", {
      name: inputUsed.appName,
      request: inputUsed.request,
    });
    routeExercised.push(intake.route);
    const projectId = String(intake.body?.projectId || "");
    executedSteps.push({
      step: "intake_universal_pipeline_project",
      status: intake.status === 200 && projectId ? "passed" : "failed",
      details: `status=${intake.status} projectId=${projectId || "missing"}`,
    });

    const pipelineRes = await requestJson("POST", `/api/projects/${projectId}/universal/capability-pipeline`, {
      input: inputUsed.request,
    });
    routeExercised.push(pipelineRes.route);
    const output = pipelineRes.body || {};
    executedSteps.push({
      step: "run_universal_capability_pipeline",
      status: pipelineRes.status === 200 ? "passed" : "failed",
      details: `status=${pipelineRes.status}`,
    });

    const readBack = await requestJson("GET", `/api/projects/${projectId}/universal/capability-pipeline`);
    routeExercised.push(readBack.route);
    executedSteps.push({
      step: "read_universal_capability_artifacts",
      status: readBack.status === 200 ? "passed" : "failed",
      details: `status=${readBack.status}`,
    });

    const planPackets = Array.isArray(output?.implementationPlan?.packets)
      ? output.implementationPlan.packets.length
      : 0;
    const graphNodes = Array.isArray(output?.buildGraph?.nodes) ? output.buildGraph.nodes.length : 0;
    const hasRequiredOutputs = Boolean(
      output?.extractedProductTruth &&
      output?.buildContract &&
      output?.buildGraph &&
      output?.implementationPlan &&
      output?.generatedCode &&
      output?.validationProof &&
      output?.launchPacket &&
      output?.reusableSubsystems
    );

    validatorsRun.push({
      name: "universal_output_contract",
      status: hasRequiredOutputs ? "passed" : "failed",
      details: `hasRequiredOutputs=${hasRequiredOutputs} packets=${planPackets} graphNodes=${graphNodes}`,
    });
    validatorsRun.push({
      name: "universal_output_depth",
      status: planPackets >= 10 && graphNodes >= 10 ? "passed" : "failed",
      details: `planPackets=${planPackets} graphNodes=${graphNodes}`,
    });

    const domainDepthResults: Array<{
      domainId: string;
      domainName: string;
      request: string;
      routeStatus: number;
      hasRequiredOutputs: boolean;
      planPacketCount: number;
      buildGraphNodeCount: number;
      status: "passed" | "failed";
      blockers: string[];
    }> = [];

    for (const domain of domainBuilderRegistry) {
      const domainRequest = domainRequestFor(domain.id, domain.name);
      const domainIntake = await requestJson("POST", "/api/projects/intake", {
        name: `Domain Depth ${domain.name}`,
        request: domainRequest,
      });

      const domainProjectId = String(domainIntake.body?.projectId || "");
      const domainPipeline = await requestJson("POST", `/api/projects/${domainProjectId}/universal/capability-pipeline`, {
        input: domainRequest,
      });

      const domainOut = domainPipeline.body || {};
      const domainPackets = Array.isArray(domainOut?.implementationPlan?.packets)
        ? domainOut.implementationPlan.packets.length
        : 0;
      const domainGraphNodes = Array.isArray(domainOut?.buildGraph?.nodes)
        ? domainOut.buildGraph.nodes.length
        : 0;
      const domainHasOutputs = Boolean(
        domainOut?.extractedProductTruth &&
        domainOut?.buildContract &&
        domainOut?.buildGraph &&
        domainOut?.implementationPlan &&
        domainOut?.generatedCode &&
        domainOut?.validationProof &&
        domainOut?.launchPacket
      );
      const domainBlockers = Array.isArray(domainOut?.launchPacket?.blockers)
        ? domainOut.launchPacket.blockers
        : [];

      const domainStatus =
        domainPipeline.status === 200 && domainHasOutputs && domainPackets >= 10 && domainGraphNodes >= 10
          ? "passed"
          : "failed";

      domainDepthResults.push({
        domainId: domain.id,
        domainName: domain.name,
        request: domainRequest,
        routeStatus: domainPipeline.status,
        hasRequiredOutputs: domainHasOutputs,
        planPacketCount: domainPackets,
        buildGraphNodeCount: domainGraphNodes,
        status: domainStatus,
        blockers: domainBlockers,
        requiredSpecs: domain.requiredSpecs,
        buildCommands: domain.buildCommands,
        testCommands: domain.testCommands,
        validationCommands: domain.validationCommands,
        launchRubric: domain.commercialReadinessRubric,
        noPlaceholderRules: domain.noPlaceholderRules,
        repairStrategy: domain.repairStrategy,
        readinessStatus: domainStatus,
        validatorMapped: true,
      });
    }

    const domainFailed = domainDepthResults.filter((d) => d.status === "failed");
    validatorsRun.push({
      name: "domain_specific_runtime_depth",
      status: domainFailed.length === 0 ? "passed" : "failed",
      details: `domainCount=${domainDepthResults.length} failed=${domainFailed.length}`,
    });

    const stepSummary = summarizeStepStatus(executedSteps);
    const remainingBlockers = Array.isArray(output?.launchPacket?.blockers)
      ? output.launchPacket.blockers
      : [];
    const status = stepSummary.failedSteps === 0 && hasRequiredOutputs && planPackets >= 10 && graphNodes >= 10 && domainFailed.length === 0
      ? "passed"
      : "failed";

    const universalOutput = {
      hasExtractedProductTruth: Boolean(output?.extractedProductTruth),
      hasMissingQuestions: Array.isArray(output?.missingQuestions),
      hasAssumptions: Array.isArray(output?.assumptions),
      hasArchitectureRecommendation: Boolean(output?.architectureRecommendation),
      hasBuildContract: Boolean(output?.buildContract),
      hasBuildGraph: Boolean(output?.buildGraph),
      hasImplementationPlan: Boolean(output?.implementationPlan),
      hasGeneratedCodeOrPacketTargets: Array.isArray(output?.generatedCode) && output.generatedCode.length >= 1,
      hasValidationProof: Boolean(output?.validationProof),
      hasLaunchPacket: Boolean(output?.launchPacket),
    };

    const proofEntry = createProofEntry({
      scope: "release",
      claim: "Universal capability pipeline runtime route emits full multi-artifact contract from messy input.",
      evidence: ["/api/projects/:projectId/universal/capability-pipeline", "buildUniversalCapabilityArtifacts"],
      validatorSummary: validatorsRun.map((v) => `${v.name}:${v.status}`).join(", "),
      outcome: status === "passed" ? "passed" : "failed",
      rollbackPlan: "Revert universal capability pipeline changes and regenerate artifact contract with proof checks.",
    });
    const claimVerification = verifyClaim(proofEntry);

    return {
      generatedAt: new Date().toISOString(),
      proofGrade: "local_runtime",
      pathId: "universal_capability_pipeline",
      inputUsed,
      routeExercised,
      apiFunctionPathExercised: [
        "apps/orchestrator-api/src/server_app.ts#POST /api/projects/:projectId/universal/capability-pipeline",
        "apps/orchestrator-api/src/server_app.ts#GET /api/projects/:projectId/universal/capability-pipeline",
        "apps/orchestrator-api/src/server_app.ts#buildUniversalCapabilityArtifacts",
        "packages/truth-engine/src/index.ts#extractProductTruth",
        "packages/spec-engine/src/buildContract.ts#generateBuildContract",
        "packages/packet-engine/src/generator.ts#generatePlan",
      ],
      contract: {
        type: "build_contract",
        payload: output?.buildContract || {},
      },
      generatedPlanOrBuildGraph: {
        buildGraphNodeCount: graphNodes,
        buildGraphEdgeCount: Array.isArray(output?.buildGraph?.edges) ? output.buildGraph.edges.length : 0,
        planPacketCount: planPackets,
        reusableSubsystemCount: output?.reusableSubsystems ? Object.keys(output.reusableSubsystems).length : 0,
        domainDepthMatrix: {
          totalDomains: domainDepthResults.length,
          failedDomains: domainFailed.length,
          results: domainDepthResults,
        },
      },
      universalOutput,
      executedSteps,
      validatorsRun,
      producedArtifacts: [
        "extractedProductTruth",
        "buildContract",
        "buildGraph",
        "implementationPlan",
        "generatedCode",
        "validationProof",
        "launchPacket",
        "reusableSubsystems",
      ],
      proofLedgerReferences: [
        {
          entry: proofEntry,
          claimVerification,
        },
      ],
      status,
      remainingBlockers,
      summary: stepSummary,
    } as ProofArtifact;
  });

  const outPath = writeProofArtifact("universal_pipeline_runtime_proof.json", artifact);
  writeProofArtifact("domain_runtime_depth_matrix.json", {
    generatedAt: artifact.generatedAt,
    proofGrade: artifact.proofGrade,
    pathId: artifact.pathId,
    inputUsed: artifact.inputUsed,
    routeExercised: artifact.routeExercised,
    apiFunctionPathExercised: artifact.apiFunctionPathExercised,
    contract: artifact.contract,
    generatedPlanOrBuildGraph: artifact.generatedPlanOrBuildGraph,
    executedSteps: artifact.executedSteps,
    validatorsRun: artifact.validatorsRun,
    producedArtifacts: artifact.producedArtifacts,
    proofLedgerReferences: artifact.proofLedgerReferences,
    status: artifact.status,
    remainingBlockers: artifact.remainingBlockers,
    summary: artifact.summary,
  });
  console.log(`Universal capability runtime proof written: ${outPath}`);
  console.log(`status=${artifact.status} passedSteps=${artifact.summary.passedSteps} failedSteps=${artifact.summary.failedSteps}`);

  if (artifact.status !== "passed") {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(String((error as any)?.message || error));
  process.exit(1);
});
