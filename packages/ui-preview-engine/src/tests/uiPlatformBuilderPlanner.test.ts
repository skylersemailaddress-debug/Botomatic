import assert from "assert"; import { createUIPlatformBuilderPlan } from "../uiPlatformBuilderPlanner";
const ok=createUIPlatformBuilderPlan({targetPlatform:"ios-app",builderKind:"expo",framework:"expo",projectName:"Demo",sourceFiles:{"src/a.ts":"a"},assets:[{path:"assets/icon.png",kind:"icon-1024"},{path:"assets/i2.png",kind:"icon-512"},{path:"assets/s.png",kind:"splash"},{path:"assets/store.json",kind:"app-store-metadata"},{path:"assets/privacy.md",kind:"privacy-policy-reference"}],manifest:{identifier:"a",permissions:["camera"],displayName:"a",version:"1"}});
assert.equal(ok.plan.publishBlocked,true); assert.equal(ok.plan.buildExecutionBlocked,true); assert(ok.plan.platformBuilderPlanId.startsWith("platform-builder-"));
const bad=createUIPlatformBuilderPlan({targetPlatform:"ios",builderKind:"pwa",framework:"node-api",projectName:"x",sourceFiles:{"../x":"x"},assets:[{path:".env",kind:"icon-1024"}],manifest:{},options:{allowBuildExecution:true,allowPublish:true}});
assert.equal(bad.plan.requiresManualReview,true); assert.equal(bad.plan.riskLevel,"high");
console.log("uiPlatformBuilderPlanner.test.ts passed");
