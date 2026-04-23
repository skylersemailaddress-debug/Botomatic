import fs from "fs";
import path from "path";
import { compileConversationToMasterTruth } from "../../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../../packages/packet-engine/src/generator";

type Case = {
  id: string;
  appName: string;
  request: string;
};

type CaseScore = {
  id: string;
  scoreOutOf10: number;
  dimensions: {
    appStructure: number;
    authShell: number;
    dataModel: number;
    workflowCompleteness: number;
    validationBuildPath: number;
    codeQualitySignals: number;
  };
  notes: string[];
};

function scoreCase(input: Case): CaseScore {
  const truth = compileConversationToMasterTruth({
    projectId: `bench_${input.id}`,
    appName: input.appName,
    request: input.request,
  });

  const plan = generatePlan(truth as any);
  const packets = Array.isArray((plan as any).packets) ? (plan as any).packets : [];

  const appStructure = truth.stack?.frontend && truth.stack?.backend && packets.length >= 5 ? 2 : 0;
  const authShell = truth.features.includes("Authentication") && Array.isArray(truth.roles) && truth.roles.length >= 2 ? 2 : truth.routes.includes("/login") ? 1 : 0;
  const dataModel = Array.isArray(truth.entities) && truth.entities.length >= 3 ? 2 : truth.entities.length >= 1 ? 1 : 0;
  const workflowCompleteness = truth.workflows.length >= 3 ? 2 : truth.workflows.length >= 1 ? 1 : 0;
  const validationBuildPath = packets.every((p: any) => Array.isArray(p.validationCommands) && p.validationCommands.includes("npm run build")) ? 1 : 0;
  const codeQualitySignals = truth.supportLevel === "first_class" && truth.constraints.length >= 3 && truth.acceptanceCriteria.length >= 3 ? 1 : 0;

  const total = appStructure + authShell + dataModel + workflowCompleteness + validationBuildPath + codeQualitySignals;

  const notes: string[] = [];
  if (authShell < 2) notes.push("Auth shell is not enterprise-grade (role model depth is limited).");
  if (dataModel < 2) notes.push("Data model depth is below enterprise benchmark target.");
  if (workflowCompleteness < 2) notes.push("Workflow modeling depth is shallow.");
  if (codeQualitySignals < 1) notes.push("Support level remains bounded_prototype, not first_class.");

  return {
    id: input.id,
    scoreOutOf10: total,
    dimensions: {
      appStructure,
      authShell,
      dataModel,
      workflowCompleteness,
      validationBuildPath,
      codeQualitySignals,
    },
    notes,
  };
}

function run() {
  const root = process.cwd();
  const casesPath = path.join(root, "release-evidence", "benchmarks", "builder_quality_cases.json");
  const raw = fs.readFileSync(casesPath, "utf8");
  const cases = JSON.parse(raw) as Case[];

  const results = cases.map(scoreCase);
  const average = results.reduce((sum, r) => sum + r.scoreOutOf10, 0) / Math.max(1, results.length);

  const payload = {
    generatedAt: new Date().toISOString(),
    proofGrade: "local_static",
    methodology: "compiler+planner benchmark scoring",
    averageScoreOutOf10: Number(average.toFixed(2)),
    thresholdTarget: 8.5,
    cases: results,
  };

  const outDir = path.join(root, "release-evidence", "runtime");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "builder_quality_benchmark.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`Builder quality benchmark written: ${outPath}`);
  console.log(`averageScoreOutOf10=${payload.averageScoreOutOf10}`);
}

run();
