import assert from "assert";
import { createUIExportBundleManifest } from "../uiExportBundlePlanner";

const one = createUIExportBundleManifest({ sourceFiles: { "src\\a.ts": "a", "src/b.ts": "bb" }, fullProjectGenerationPlan: { files: [{ path: "dist/app.js", referenceOnly: true }] }, sourcePatchPlan: { operations: [{ target: { filePath: "src/c.ts" } }] } });
const two = createUIExportBundleManifest({ sourceFiles: { "src/a.ts": "a", "src/b.ts": "bb" }, fullProjectGenerationPlan: { files: [{ path: "dist/app.js", referenceOnly: true }] }, sourcePatchPlan: { operations: [{ target: { filePath: "src/c.ts" } }] } });
assert.equal(one.bundleManifestId, two.bundleManifestId);
assert.deepEqual(one.files.map((f) => f.filePath), [...one.files.map((f) => f.filePath)].sort());
assert.equal(one.totalBytes, 3);

assert(createUIExportBundleManifest({ sourceFiles: { "/abs.ts": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { "../x.ts": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { "": "x" } }).issues.some((i) => i.code === "empty-path"));
assert(createUIExportBundleManifest({ sourceFiles: { "release-evidence/runtime/proof.json": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { ".env": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { "secret/private.key": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { "node_modules/x": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ sourceFiles: { "dist/app.js": "x" } }).issues.length > 0);
assert(createUIExportBundleManifest({ fullProjectGenerationPlan: { files: [{ path: "dist/app.js", referenceOnly: true }] } }).issues.every((i) => i.code !== "unsafe-path"));
assert(createUIExportBundleManifest({ fullProjectGenerationPlan: { files: [{ path: "src/x.ts" }] } }).issues.some((i) => i.code === "missing-source-proof"));
const malformed = createUIExportBundleManifest({ sourcePatchPlan: { operations: [null as unknown as { target?: { filePath?: string } }] } });
assert(malformed.issues.some((i) => i.code === "malformed-input"));

console.log("uiExportBundlePlanner.test.ts passed");
