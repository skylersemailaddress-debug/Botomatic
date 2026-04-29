import crypto from "crypto";
import { UI_DATA_STATE_API_WIRING_CAVEAT, type UIDataStateApiWiringPlan, type UIDataStateApiWiringResult } from "./uiDataStateApiWiringModel";

export function planUIDataStateApiWiring(result: UIDataStateApiWiringResult, deps: {
  editableDocument?: { nodes?: Array<{ id?: string }>; filePath?: string };
  sourceIdentityResult?: { identities?: Array<{ sourceIdentityId?: string }>; summary?: string };
  multiFilePlanResult?: { plan?: { planId?: string; operations?: Array<{ target?: { filePath?: string } }> } };
  fullProjectGenerationPlan?: { plan?: { planId?: string; orderedFilePaths?: string[] } };
  options: { targetFramework: "next"|"vite-react"|"node-api"|"unknown"; outputMode: "previewMetadata"|"sourcePatchPlan"|"fullProjectReference"|"unknown"; targetFilePath?: string };
}): UIDataStateApiWiringPlan {
  const n = result.normalizedInput;
  const affectedNodeIds = [...new Set([
    ...n.bindings.map((b) => b.nodeId),
    ...n.stateBindings.map((s) => s.nodeId).filter(Boolean) as string[],
    ...n.stateActions.map((a) => a.triggerNodeId).filter(Boolean) as string[],
    ...n.apiRequestBindings.map((r) => r.triggerNodeId).filter(Boolean) as string[]
  ])].sort((a, b) => a.localeCompare(b));
  const affectedFilePaths = [...new Set([deps.options.targetFilePath, deps.editableDocument?.filePath, ...(deps.multiFilePlanResult?.plan?.operations ?? []).map((o) => o.target?.filePath)].filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b));
  const orderedOperations = [
    { order: 1 as const, label: "declare state" },
    { order: 2 as const, label: "bind state to nodes" },
    { order: 3 as const, label: "define API client/request helper" },
    { order: 4 as const, label: "bind request to UI action" },
    { order: 5 as const, label: "map API response to state/UI" }
  ];
  const blockedReasons = [...result.issues.map((i) => `${i.code}:${i.path}`)];
  const nodeSet = new Set((deps.editableDocument?.nodes ?? []).map((x) => x.id).filter(Boolean));
  if (n.bindings.some((b) => !nodeSet.has(b.nodeId))) blockedReasons.push("binding references missing node");
  if (n.apiEndpoints.some((e) => e.url.startsWith("https://"))) blockedReasons.push("external endpoint present");
  if (n.apiEndpoints.some((e) => e.method === "DELETE" || e.method === "PATCH")) blockedReasons.push("destructive API method present");
  if (deps.options.outputMode === "unknown") blockedReasons.push("unknown outputMode");
  if (deps.options.outputMode === "sourcePatchPlan" && !deps.sourceIdentityResult) blockedReasons.push("missing source identity for sourcePatchPlan mode");
  if (deps.options.targetFilePath && deps.fullProjectGenerationPlan?.plan?.orderedFilePaths?.includes(deps.options.targetFilePath)) blockedReasons.push("target file conflicts with full project plan");

  const requiresManualReview = blockedReasons.length > 0;
  const riskLevel = requiresManualReview || blockedReasons.some((x) => /external|destructive|missing node|unknown outputMode|missing source identity|conflicts/.test(x)) ? "high" : affectedNodeIds.length > 8 ? "medium" : "low";
  const seed = JSON.stringify({ n, affectedNodeIds, affectedFilePaths, orderedOperations, options: deps.options, sourceIdentityIds: deps.sourceIdentityResult?.identities?.map((i) => i.sourceIdentityId).filter(Boolean) ?? [], multiFilePlanId: deps.multiFilePlanResult?.plan?.planId ?? "", fullProjectPlanId: deps.fullProjectGenerationPlan?.plan?.planId ?? "", issues: result.issues });
  const wiringPlanId = `wiring-${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;

  return { wiringPlanId, ...n, affectedNodeIds, affectedFilePaths, orderedOperations, riskLevel, requiresManualReview, blockedReasons: [...new Set(blockedReasons)].sort((a,b)=>a.localeCompare(b)), sourceIdentityIds: (deps.sourceIdentityResult?.identities ?? []).map((i)=>i.sourceIdentityId).filter(Boolean) as string[], multiFilePlanId: deps.multiFilePlanResult?.plan?.planId, fullProjectPlanId: deps.fullProjectGenerationPlan?.plan?.planId, caveat: UI_DATA_STATE_API_WIRING_CAVEAT };
}
