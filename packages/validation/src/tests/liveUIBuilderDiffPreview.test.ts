import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDiffPreview.tsx", "utf8");
assert(c.includes("Added nodes"));
assert(c.includes("Removed nodes"));
assert(c.includes("Changed nodes/text/props"));
assert(c.toLowerCase().includes("planning-only"));
console.log("liveUIBuilderDiffPreview.test.ts passed");
