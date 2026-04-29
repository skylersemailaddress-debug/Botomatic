import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
assert(c.includes("runSampleEdit"));
assert(c.includes("runDestructiveEdit"));
assert(c.includes("onClick={confirmPending}"));
assert(c.includes("onClick={rejectPending}"));
assert(c.includes("disabled={!confirmationPending}"));
console.log("liveUIBuilderVibePanel.test.ts passed");
