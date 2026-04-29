import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
assert(c.includes("LiveUIBuilderPreviewSurface"));
assert(c.includes("Confirm"));
assert(c.includes("Reject"));
assert(c.includes("disabled={!confirmationPending}"));
console.log("liveUIBuilderVibePanel.test.ts passed");
