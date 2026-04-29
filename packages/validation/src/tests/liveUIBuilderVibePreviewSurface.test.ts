import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface.tsx", "utf8");
assert(c.includes("data-preview-status=\"structural-bridge\""));
assert(c.includes("not final rendered UI"));
assert(c.includes("headline ?? \"Your Escape Awaits\""));
console.log("liveUIBuilderVibePreviewSurface.test.ts passed");
