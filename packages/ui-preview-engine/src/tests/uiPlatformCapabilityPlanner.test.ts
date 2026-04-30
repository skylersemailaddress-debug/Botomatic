import assert from "assert"; import { createUIPlatformCapabilityPlan } from "../uiPlatformCapabilityPlanner";
for (const [t,b,f] of [["ios","expo","expo"],["android","react-native","react-native"],["mobile-web","pwa","next"],["web-game","web-canvas","vite-react"],["roblox","roblox-studio","lua"],["steam","steamworks","unity"]] as any[]) { const p=createUIPlatformCapabilityPlan({targetPlatform:t,builderKind:b,framework:f}); assert(p.requiredAssets.length>0); assert(p.manifestRequirements.length>0); }
console.log("uiPlatformCapabilityPlanner.test.ts passed");
