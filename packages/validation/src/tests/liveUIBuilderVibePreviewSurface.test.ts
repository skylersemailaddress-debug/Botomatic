import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface.tsx", "utf8");
assert(c.includes("data-testid=\"live-ui-builder-preview-surface\""));
assert(c.includes("vibe-live-preview"));
console.log("liveUIBuilderVibePreviewSurface.test.ts passed");
