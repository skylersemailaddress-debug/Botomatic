import crypto from "crypto";
import { createUIPlatformCapabilityPlan } from "./uiPlatformCapabilityPlanner";
import { UI_PLATFORM_BUILDER_CAVEAT, type UIPlatformBuilderIssue, type UIPlatformBuilderPlan, type UIPlatformBuilderResult } from "./uiPlatformBuilderModel";
import { normalizeUIPlatformBuilderKind, normalizeUIPlatformFramework, normalizeUIPlatformProjectSlug, normalizeUIPlatformTarget } from "./uiPlatformTargetNormalizer";

export function createUIPlatformBuilderPlan(input: any): UIPlatformBuilderResult {
  const issues: UIPlatformBuilderIssue[] = [];
  try {
    const targetPlatform = normalizeUIPlatformTarget(String(input?.targetPlatform ?? ""));
    const builderKind = normalizeUIPlatformBuilderKind(String(input?.builderKind ?? ""));
    const framework = normalizeUIPlatformFramework(String(input?.framework ?? ""));
    const projectName = String(input?.projectName ?? "");
    const normalizedProjectSlug = normalizeUIPlatformProjectSlug(projectName);
    const sourceFiles = input?.sourceFiles && typeof input.sourceFiles === "object" ? input.sourceFiles : {};
    const sourcePaths = Object.keys(sourceFiles);
    const sourceTotalBytes = sourcePaths.reduce((n,p)=> n + Buffer.byteLength(String(sourceFiles[p] ?? "")),0);
    const sourceUnsafe = sourcePaths.filter(isUnsafePath);
    const capabilityPlan = createUIPlatformCapabilityPlan({targetPlatform,builderKind,framework});
    const assets = Array.isArray(input?.assets) ? input.assets : [];
    const assetKinds = new Set(assets.map((a:any)=>String(a?.kind ?? "")));
    const assetUnsafe = assets.map((a:any)=>String(a?.path ?? "")).filter(isUnsafePath);
    const missingAssets = capabilityPlan.requiredAssets.map((a)=>a.kind).filter((k)=>!assetKinds.has(k));
    const manifest = (input?.manifest && typeof input.manifest === "object") ? input.manifest : {};
    const missingManifest = capabilityPlan.manifestRequirements.map((m)=>m.field).filter((f)=> manifest[f] == null || manifest[f] === "");
    const gates = [
      {gate:"target platform known", passed: targetPlatform!=="unknown", reason: targetPlatform},
      {gate:"builder kind known", passed: builderKind!=="unknown", reason: builderKind},
      {gate:"framework known", passed: framework!=="unknown", reason: framework},
      {gate:"framework compatible", passed: compatible(targetPlatform,builderKind,framework), reason:"compatibility check"},
      {gate:"required assets present", passed: missingAssets.length===0, reason: missingAssets.join(",") || "ok"},
      {gate:"manifest requirements present", passed: missingManifest.length===0, reason: missingManifest.join(",") || "ok"},
      {gate:"source paths safe", passed: sourceUnsafe.length===0 && assetUnsafe.length===0, reason:[...sourceUnsafe,...assetUnsafe].join(",")||"ok"},
      {gate:"build execution blocked", passed:true, reason:"blocked by design"},
      {gate:"publish blocked", passed:true, reason:"blocked by design"},
    ];
    const blockedReasons = [
      ...(sourceUnsafe.length? ["unsafe source path"]:[]), ...(assetUnsafe.length?["unsafe asset path"]:[]),
      ...(missingAssets.length?["missing required asset"]:[]), ...(missingManifest.length?["missing manifest requirement"]:[]),
      ...((input?.options?.allowBuildExecution===true)?["allowBuildExecution=true blocked"]:[]), ...((input?.options?.allowPublish===true)?["allowPublish=true blocked"]:[])
    ];
    if (/(token|secret|private[_-]?key|app.?store|play.?store)/i.test(JSON.stringify({manifest,assets,options:input?.options??{}}))) blockedReasons.push("credential-like strings detected");
    if (input?.options?.requirePrivacyPolicy && !assetKinds.has("privacy-policy-reference")) blockedReasons.push("missing privacy policy reference");
    if (input?.options?.requireStoreMetadata && !assetKinds.has("app-store-metadata") && !(manifest as any).storeMetadata) blockedReasons.push("missing required store metadata");
    if (input?.exportDeployPlan?.requiresManualReview || input?.exportDeployPlan?.riskLevel === "high") blockedReasons.push("export/deploy requires manual review");
    if (input?.scalabilityPlan?.requiresManualReview || input?.scalabilityPlan?.riskLevel === "high") blockedReasons.push("scalability requires manual review");
    const requiresManualReview = blockedReasons.length>0 || gates.some((g)=>!g.passed);
    const riskLevel = requiresManualReview ? "high" : "low" as const;
    const affectedFilePaths=[...new Set([...sourcePaths,...assets.map((a:any)=>String(a?.path??""))])].sort();
    const platformBuilderPlanId = `platform-builder-${crypto.createHash("sha256").update(JSON.stringify({targetPlatform,builderKind,framework,normalizedProjectSlug,affectedFilePaths,sourceTotalBytes,missingAssets,missingManifest,blockedReasons:[...new Set(blockedReasons)].sort()})).digest("hex").slice(0,16)}`;
    const plan: UIPlatformBuilderPlan = { platformBuilderPlanId,targetPlatform,builderKind,framework,projectName,normalizedProjectSlug,requiredAssets:capabilityPlan.requiredAssets,missingAssets,manifestRequirements:capabilityPlan.manifestRequirements,platformCapabilities:capabilityPlan.capabilities,compatibilityGates:gates,exportDeployPlanId:input?.exportDeployPlan?.exportDeployPlanId,sourceFileCount:sourcePaths.length,sourceTotalBytes,affectedFilePaths,blockedReasons:[...new Set(blockedReasons)].sort(),publishBlocked:true,buildExecutionBlocked:true,requiresManualReview,riskLevel,caveat:UI_PLATFORM_BUILDER_CAVEAT };
    return { status: requiresManualReview ? "blocked" : "planned", plan, issues, risks:[riskLevel] };
  } catch (error: any) { issues.push({code:"PLANNER_MALFORMED_INPUT",message:String(error?.message ?? error),severity:"error"}); return { status:"blocked", issues, risks:["high"], plan: { platformBuilderPlanId:"platform-builder-error", targetPlatform:"unknown", builderKind:"unknown", framework:"unknown", projectName:"", normalizedProjectSlug:"untitled-platform-project", requiredAssets:[], missingAssets:[], manifestRequirements:[], platformCapabilities:[], compatibilityGates:[], sourceFileCount:0, sourceTotalBytes:0, affectedFilePaths:[], blockedReasons:["malformed input"], publishBlocked:true, buildExecutionBlocked:true, requiresManualReview:true, riskLevel:"high", caveat:UI_PLATFORM_BUILDER_CAVEAT } }; }
}
function compatible(t:any,b:any,f:any){ if (["ios","android"].includes(t)) return ["expo","react-native","capacitor"].includes(b) && f!=="node-api"; if (["mobile-web","desktop-web"].includes(t)) return ["pwa","capacitor","web-canvas"].includes(b) && ["next","vite-react","react-native","expo","unknown","node-api"].includes(f); if (t==="roblox") return b==="roblox-studio" && ["lua","roblox-ts"].includes(f); if (t==="steam") return ["steamworks","unity","godot"].includes(b) && ["unity","godot","node-api"].includes(f)===false; if (t==="web-game") return ["web-canvas","unity","godot"].includes(b); return false; }
function isUnsafePath(path:string){ const p=String(path||"").trim().toLowerCase(); return !p || p.startsWith("/") || p.includes("..") || p.includes("release-evidence/runtime/") || p.includes(".env") || p.includes("secret") || p.includes("private") || p.includes("key") || p.includes("node_modules") || /(^|\/)(dist|build|out)\//.test(p); }
