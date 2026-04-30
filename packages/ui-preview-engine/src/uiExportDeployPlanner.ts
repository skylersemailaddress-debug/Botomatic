import crypto from "crypto";
import { createUIExportBundleManifest } from "./uiExportBundlePlanner";
import { createUIDeployTargetPlan } from "./uiDeployTargetPlanner";
import { UI_EXPORT_DEPLOY_CAVEAT, type UIExportDeployPlan } from "./uiExportDeployModel";

export function createUIExportDeployPlan(input:{fullProjectGenerationPlan?:any;sourcePatchPlan?:any;sourceFiles?:Record<string,string>;scalabilityPlan?:any;reliabilityRepairPlan?:any;uxControlPlan?:any;options:{provider:any;framework:any;targetName:string;allowLiveDeploy?:boolean;requireRollbackPlan?:boolean;target?:{staticExport?:boolean;hasApiRoutes?:boolean;rollbackReference?:string}}}):UIExportDeployPlan{
 const bundleManifest=createUIExportBundleManifest({fullProjectGenerationPlan:input.fullProjectGenerationPlan,sourcePatchPlan:input.sourcePatchPlan,sourceFiles:input.sourceFiles});
 const target={name:input.options.targetName,kind:"dry-run" as const,staticExport:input.options.target?.staticExport,hasApiRoutes:input.options.target?.hasApiRoutes,rollbackReference:input.options.target?.rollbackReference};
 const targetPlan=createUIDeployTargetPlan({provider:input.options.provider,framework:input.options.framework,bundleManifest,environmentVariables:[],target,scalabilityPlan:input.scalabilityPlan,reliabilityRepairPlan:input.reliabilityRepairPlan,uxControlPlan:input.uxControlPlan,rollbackPlanRequired:Boolean(input.options.requireRollbackPlan),rollbackReference:input.options.target?.rollbackReference});
 const sourcePatchOperationIds=(input.sourcePatchPlan?.operations??[]).map((o:any)=>o.operationId).filter(Boolean).sort();
 const affectedFilePaths=[...new Set(bundleManifest.files.map((f)=>f.filePath))].sort();
 const blockedReasons=[...targetPlan.blockedReasons];
 if(input.options.allowLiveDeploy) blockedReasons.push("allowLiveDeploy=true blocked");
 if(bundleManifest.requiresSourceProof) blockedReasons.push("source proof missing");
 const requiresManualReview = targetPlan.requiresManualReview || bundleManifest.requiresSourceProof || Boolean(input.options.allowLiveDeploy) || (Boolean(input.options.requireRollbackPlan)&&!Boolean(input.options.target?.rollbackReference));
 const riskLevel = requiresManualReview ? "high" : targetPlan.riskLevel;
 const exportDeployPlanId=`export-deploy-${crypto.createHash("sha256").update(JSON.stringify({provider:input.options.provider,framework:input.options.framework,target:target.name,bundle:bundleManifest.bundleManifestId,blockedReasons:[...new Set(blockedReasons)].sort(),affectedFilePaths,sourcePatchOperationIds})).digest("hex").slice(0,16)}`;
 return {exportDeployPlanId,provider:input.options.provider,target,framework:input.options.framework,bundleManifest,environmentVariables:[],providerCapabilities:targetPlan.providerCapabilities,readinessGates:targetPlan.readinessGates,rollbackPlanRequired:Boolean(input.options.requireRollbackPlan),previewUrlPlanned:targetPlan.previewUrlPlanned,liveDeployBlocked:true,affectedFilePaths,sourcePatchOperationIds,fullProjectPlanId:input.fullProjectGenerationPlan?.planId,scalabilityPlanId:input.scalabilityPlan?.planId,reliabilityRepairPlanId:input.reliabilityRepairPlan?.repairPlanId,uxControlPlanId:input.uxControlPlan?.uxControlPlanId,blockedReasons:[...new Set(blockedReasons)].sort(),riskLevel,requiresManualReview,caveat:UI_EXPORT_DEPLOY_CAVEAT};
}
