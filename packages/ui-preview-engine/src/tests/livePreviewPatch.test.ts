import assert from "assert";
import { createLivePreviewPatch, validateLivePreviewPatch } from "../livePreviewPatch";
const kinds = ["nodeAdded","nodeRemoved","nodeMoved","nodeUpdated","pageAdded","pageRemoved","themeUpdated","validationFailed"] as const;
for (const kind of kinds) assert.ok(validateLivePreviewPatch(createLivePreviewPatch([{ kind }])).valid);
assert.strictEqual(validateLivePreviewPatch({ createdAt: "x", operations: [{ kind: "bad" as any }], claimBoundary: "x" }).valid, false);
const caveat = createLivePreviewPatch([]).claimBoundary.toLowerCase();
assert.ok(caveat.includes("does not render ui")); assert.ok(caveat.includes("sync source files"));
console.log("livePreviewPatch tests passed");
