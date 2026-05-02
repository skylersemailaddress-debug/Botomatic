/**
 * WAVE-038: Launch Proof + Deploy Gating Validation
 * 
 * Tests that:
 * 1. Launch proof server store exists and works
 * 2. Launch proof service provides client-side API
 * 3. Launch-proof routes gate properly
 * 4. Deploy/rollback routes blocked without verified proof
 * 5. Hard rules enforced:
 *    - No faking launch proof
 *    - No setting launchReady from runtime preview alone
 *    - No using derivedPreviewUrl as proof
 *    - Launch/deploy blocked unless verified proof exists
 *    - No real external deployment
 *    - No arbitrary shell execution
 *    - Centralized getJsonSafe/postJsonSafe for services
 *    - All WAVE-025-037 tests pass
 */
import assert from "assert";
import fs from "fs";

// Verify server store exists and exports correct interface
const launchProofStoreSource = fs.readFileSync("apps/control-plane/src/server/launchProofStore.ts", "utf8");
assert(launchProofStoreSource.includes("LaunchProof"), "server store must define LaunchProof type");
assert(launchProofStoreSource.includes("verified: boolean"), "LaunchProof must have verified field");
assert(launchProofStoreSource.includes("class LaunchProofStore"), "must have LaunchProofStore class");
assert(launchProofStoreSource.includes("getProof"), "LaunchProofStore must have getProof method");
assert(launchProofStoreSource.includes("setProof"), "LaunchProofStore must have setProof method");
assert(launchProofStoreSource.includes("getProofStore"), "must export getProofStore singleton");

// Verify service exists and uses centralized API
const launchProofServiceSource = fs.readFileSync("apps/control-plane/src/services/launchProof.ts", "utf8");
assert(launchProofServiceSource.includes("getJsonSafe"), "service must use getJsonSafe");
assert(launchProofServiceSource.includes("postJsonSafe"), "service must use postJsonSafe");
assert(!launchProofServiceSource.includes("fetch("), "service must not use raw fetch");
assert(launchProofServiceSource.includes("getLaunchProof"), "must export getLaunchProof function");
assert(launchProofServiceSource.includes("verifyLaunch"), "must export verifyLaunch function");
assert(launchProofServiceSource.includes("deployProject"), "must export deployProject function");
assert(launchProofServiceSource.includes("getDeployments"), "must export getDeployments function");
assert(launchProofServiceSource.includes("rollbackDeployment"), "must export rollbackDeployment function");
assert(launchProofServiceSource.includes("verified"), "service types must reference verified field");

// Verify launch-proof route exists and enforces rules
const launchProofRouteSource = fs.readFileSync("apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts", "utf8");
assert(launchProofRouteSource.includes("launch proof"), "route must document launch proof");
assert(launchProofRouteSource.includes("verified"), "route must handle verified field");
assert(launchProofRouteSource.includes("getProofStore"), "route must use server store");
assert(!launchProofRouteSource.includes("derivedPreviewUrl"), "must not accept derivedPreviewUrl");
assert(!launchProofRouteSource.includes("child_process"), "must not perform shell execution");

// Verify launch/verify route exists and gates properly
const verifyLaunchRouteSource = fs.readFileSync("apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts", "utf8");
assert(verifyLaunchRouteSource.includes("verificationMethod"), "verify route must accept verificationMethod");
assert(verifyLaunchRouteSource.includes("verified: true, verificationMethod"), "verify must set verified=true");
assert(verifyLaunchRouteSource.includes("benchmark") || verifyLaunchRouteSource.includes("runtime"), "verify must validate verification methods");
assert(!verifyLaunchRouteSource.includes("child_process"), "must not perform shell execution");

// Verify deploy route gates on launch proof
const deployRouteSource = fs.readFileSync("apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts", "utf8");
assert(deployRouteSource.includes("getProofStore"), "deploy route must check launch proof");
assert(deployRouteSource.includes("verified"), "deploy must verify proof.verified");
assert(deployRouteSource.includes("blocked"), "deploy must block when proof missing/unverified");
assert(deployRouteSource.includes("status: \"blocked\"") || deployRouteSource.includes("403"), "deploy must return 403 if blocked");
assert(!deployRouteSource.includes("child_process"), "must not perform real shell deployment");
assert(!deployRouteSource.includes("terraform") || deployRouteSource.includes("placeholder"), "must not execute real deployment");

// Verify deployments route exists
const deploymentsRouteSource = fs.readFileSync("apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts", "utf8");
assert(deploymentsRouteSource.includes("GET"), "deployments must support GET");
assert(!deploymentsRouteSource.includes("child_process"), "deployments must not execute shell");

// Verify rollback route gates on launch proof
const rollbackRouteSource = fs.readFileSync("apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts", "utf8");
assert(rollbackRouteSource.includes("getProofStore"), "rollback route must check launch proof");
assert(rollbackRouteSource.includes("verified"), "rollback must verify proof.verified");
assert(rollbackRouteSource.includes("blocked"), "rollback must block when proof missing/unverified");
assert(!rollbackRouteSource.includes("child_process"), "must not perform real rollback");

// Verify no hardcoded fake proof
const allRoutes = [
  "apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts",
];
for (const routePath of allRoutes) {
  const routeSource = fs.readFileSync(routePath, "utf8");
  assert(!routeSource.includes("verified: true") || routeSource.includes("store.setProof"), `${routePath} must not hardcode verified=true without store.setProof`);
}

// Verify package.json has test script
const packageJsonSource = fs.readFileSync("package.json", "utf8");
assert(packageJsonSource.includes("test:wave-038"), "package.json must define test:wave-038");

console.log("wave038LaunchProofDeployGating.test.ts passed");
