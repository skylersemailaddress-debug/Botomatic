import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts", "utf8");
assert(c.includes("latestReviewPayload"));
assert(c.includes("userFacingSummary"));
assert(!c.includes("lastWorkflowResult?.summary"));
console.log("liveUIBuilderVibeHook.test.ts passed");
