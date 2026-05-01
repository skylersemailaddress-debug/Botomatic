import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/start/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/stop/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/logs/route.ts",
  "apps/control-plane/src/server/runtimeStore.ts",
]) assert(exists(rel), `missing required file: ${rel}`);

const store = read("apps/control-plane/src/server/runtimeStore.ts");
for (const marker of ["stopped", "starting", "running", "stopping", "errored", "verifiedPreviewUrl", "healthcheckUrl", "healthcheckStatus", "verifiedAt", "verifier", "receiptId", "checksum", "redactLine", "discoverRepoRoot", "while (true)"]) assert(store.includes(marker), `missing marker ${marker}`);
assert(store.includes('path.join(repoRoot, "data", "runtime")'), "runtime store should resolve repoRoot/data/runtime path segments");
assert(!store.includes("path.resolve(process.cwd(), \"data/runtime\")"), "runtime store must not pin DATA_ROOT to process.cwd()/data/runtime");

const start = read("apps/control-plane/src/app/api/projects/[projectId]/runtime/start/route.ts");
assert(start.includes("idempotencyKey is required"), "start route must require idempotency key");
assert(start.includes("Runtime start requires verified preview target"), "start route must block without verified target");
assert(start.includes("verification_failed"), "start route must fail if verification fails");
assert(start.includes("healthcheckUrl"), "start route must use healthcheck url");
assert(start.includes("state: \"running\""), "start route should only set running via verification path");
assert(!start.includes("derivedPreviewUrl"), "start route must never read derivedPreviewUrl as proof");

const logs = read("apps/control-plane/src/app/api/projects/[projectId]/runtime/logs/route.ts");
assert(logs.includes("limit"), "logs route should support capping/pagination");

const runtimeService = read("apps/control-plane/src/services/runtimeStatus.ts");
assert(runtimeService.includes("/api/projects/${encodeURIComponent(projectId)}/runtime"), "runtimeStatus must read runtime endpoint");

const previewService = read("apps/control-plane/src/services/runtimePreview.ts");
assert(previewService.includes('source: "derived"'), "derived preview semantics must remain");
assert(previewService.includes("Derived preview"), "derived preview label must remain");

const firstRun = read("apps/control-plane/src/services/firstRun.ts");
assert(!firstRun.includes("canLaunch = Boolean(runtime"), "runtime preview alone must not set canLaunch");

const pro = read("apps/control-plane/src/components/pro/ProDashboard.tsx");
const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
const proToolbar = read("apps/control-plane/src/components/pro/ProDashboardToolbar.tsx");
// Toolbar buttons are now handled by ProDashboardToolbar client component.
// Verify the component exists, is wired to launch/deploy services, and that ProDashboard uses it.
assert(pro.includes("ProDashboardToolbar"), "launch controls must be handled by ProDashboardToolbar");
assert(proToolbar.includes("requestDeploy") || proToolbar.includes("Launch"), "launch controls must remain properly gated in ProDashboardToolbar");
assert(proToolbar.includes("promoteProject") || proToolbar.includes("Deploy"), "deploy controls must remain properly gated in ProDashboardToolbar");
assert(!pro.includes("fetch("), "no raw fetch in ProDashboard");
assert(!vibe.includes("fetch("), "no raw fetch in VibeDashboard");

const pkg = read("package.json");
for (const wave of ["025","026","027","028","029","030","031","032","033","034","035","036"]) assert(pkg.includes(`test:wave-${wave}`), `missing prior wave script ${wave}`);
assert(pkg.includes("test:wave-037"), "missing wave-037 script");

console.log("WAVE-037 runtime control implementation checks passed");
