import assert from "assert";
import { createUIDeployTargetPlan } from "../uiDeployTargetPlanner";

const bundle = { bundleManifestId: "b", files: [], fileCount: 0, totalBytes: 0, hasUnsafeFiles: false, issues: [], requiresSourceProof: false };
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle }).providerCapabilities.some((c) => c.key === "next"));
assert(createUIDeployTargetPlan({ provider: "netlify", framework: "vite-react", bundleManifest: bundle }).providerCapabilities.some((c) => c.key === "vite-react"));
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, environmentVariables: [{ name: "API_KEY", secret: true, valueReference: "vault:API_KEY" }] }).blockedReasons.length === 0);
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle }).previewUrlPlanned === true);
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle }).liveDeployBlocked === true);

assert(createUIDeployTargetPlan({ provider: "unknown", framework: "unknown", bundleManifest: bundle }).requiresManualReview);
assert(createUIDeployTargetPlan({ provider: "static-host", framework: "next", bundleManifest: bundle }).blockedReasons.join(" ").includes("framework/provider incompatible"));
assert(createUIDeployTargetPlan({ provider: "static-host", framework: "next", bundleManifest: bundle, target: { staticExport: true } }).blockedReasons.join(" ").includes("framework/provider incompatible") === false);
assert(createUIDeployTargetPlan({ provider: "static-host", framework: "node-api", bundleManifest: bundle }).blockedReasons.join(" ").includes("node-api on static-host rejected"));
assert(createUIDeployTargetPlan({ provider: "static-host", framework: "vite-react", bundleManifest: bundle, target: { hasApiRoutes: true } }).blockedReasons.join(" ").includes("API route on static-host rejected"));
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, environmentVariables: [{ name: "BAD-NAME", valueReference: "x" }] }).blockedReasons.join(" ").includes("invalid env var name"));
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, environmentVariables: [{ name: "API_KEY", secret: true, value: "rawsecret" }] }).blockedReasons.join(" ").includes("raw secret literal rejected"));
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, environmentVariables: [{ name: "API_KEY", required: true }] }).requiresManualReview);
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, scalabilityPlan: { riskLevel: "high" } }).readinessGates.find((g) => g.gate === "scalability not high-risk")?.passed === false);
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, reliabilityRepairPlan: { requiresManualReview: true } }).readinessGates.find((g) => g.gate === "reliability repair not manual-review")?.passed === false);
assert(createUIDeployTargetPlan({ provider: "vercel", framework: "next", bundleManifest: bundle, uxControlPlan: { requiresManualReview: true } }).readinessGates.find((g) => g.gate === "UX apply state safe")?.passed === false);

console.log("uiDeployTargetPlanner.test.ts passed");
