import { type UIDeployCapability, type UIDeployEnvironmentVariable, type UIDeployReadinessGate, type UIExportBundleManifest, type UIExportDeployProvider, type UIExportDeployRisk } from "./uiExportDeployModel";

type Input={provider:UIExportDeployProvider; framework:"next"|"vite-react"|"node-api"|"unknown"; bundleManifest:UIExportBundleManifest; environmentVariables?:UIDeployEnvironmentVariable[]; target?:{staticExport?:boolean;hasApiRoutes?:boolean}; scalabilityPlan?:{riskLevel?:"low"|"medium"|"high";requiresManualReview?:boolean;planId?:string}; reliabilityRepairPlan?:{requiresManualReview?:boolean;repairPlanId?:string}; uxControlPlan?:{requiresManualReview?:boolean;uxControlPlanId?:string}; rollbackPlanRequired?:boolean; rollbackReference?:string};
const caps=(p:UIExportDeployProvider):UIDeployCapability[]=>({vercel:["next","vite-react","preview","env","rollback"],netlify:["vite-react","static","preview","env","build-metadata"],"static-host":["static"],"node-server":["node-api","server-runtime"],unknown:[]}[p].map((k)=>({key:k,supported:true,details:`${p}:${k}`})));
export function createUIDeployTargetPlan(input:Input){
 const providerCapabilities=caps(input.provider); const envIssues:string[]=[]; const blocked:string[]=[];
 for(const v of input.environmentVariables??[]){ if(!/^[A-Z_][A-Z0-9_]*$/.test(v.name)) envIssues.push(`invalid env var name: ${v.name}`); if(v.secret&&v.value) envIssues.push(`raw secret literal rejected: ${v.name}`); if(v.required&&!v.valueReference&&!v.value) envIssues.push(`missing required env reference: ${v.name}`); if(v.value && /(secret|token|password|private.?key)/i.test(v.value)) envIssues.push(`raw secret literal rejected: ${v.name}`); }
 const hasServer= input.provider==="vercel"||input.provider==="node-server";
 const compat = (input.framework==="next" ? (input.provider==="vercel"||input.provider==="node-server"||Boolean(input.target?.staticExport)) : input.framework==="vite-react" ? ["vercel","netlify","static-host"].includes(input.provider) : input.framework==="node-api" ? input.provider==="node-server" : false);
 if(input.provider==="unknown") blocked.push("unknown provider requires manual review"); if(!compat) blocked.push("framework/provider incompatible"); if(input.framework==="node-api"&&input.provider==="static-host") blocked.push("node-api on static-host rejected"); if(input.target?.hasApiRoutes&&!hasServer) blocked.push("API route on static-host rejected");
 if(input.bundleManifest.hasUnsafeFiles) blocked.push("bundle contains unsafe files"); if(envIssues.length) blocked.push(...envIssues);
 const gates:UIDeployReadinessGate[]=[
  {gate:"bundle manifest valid",passed:!input.bundleManifest.hasUnsafeFiles,reason:input.bundleManifest.hasUnsafeFiles?"unsafe files":"ok"},
  {gate:"no unsafe files",passed:!input.bundleManifest.hasUnsafeFiles,reason:input.bundleManifest.hasUnsafeFiles?"unsafe":"ok"},
  {gate:"framework/provider compatible",passed:compat,reason:compat?"ok":"incompatible"},
  {gate:"env vars safe",passed:envIssues.length===0,reason:envIssues.join(",")||"ok"},
  {gate:"scalability not high-risk",passed:input.scalabilityPlan?.riskLevel!=="high"&&!input.scalabilityPlan?.requiresManualReview,reason:"scalability"},
  {gate:"reliability repair not manual-review",passed:!input.reliabilityRepairPlan?.requiresManualReview,reason:"reliability"},
  {gate:"UX apply state safe",passed:!input.uxControlPlan?.requiresManualReview,reason:"ux"},
  {gate:"rollback plan present or required",passed:!input.rollbackPlanRequired||Boolean(input.rollbackReference),reason:"rollback"}
 ];
 const requiresManualReview = blocked.length>0 || gates.some(g=>!g.passed) || input.provider==="unknown";
 const riskLevel:UIExportDeployRisk = requiresManualReview?"high":"low";
 return {providerCapabilities,readinessGates:gates,previewUrlPlanned:providerCapabilities.some(c=>c.key==="preview"),liveDeployBlocked:true as const,blockedReasons:[...new Set(blocked)].sort(),requiresManualReview,riskLevel};
}
