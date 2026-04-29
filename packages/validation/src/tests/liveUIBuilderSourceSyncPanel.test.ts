import assert from "assert";
import fs from "fs";
const c=fs.readFileSync("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","utf8");
assert(c.includes("Dry Run Source Sync"));
assert(c.includes("Apply Source Patch"));
assert(c.includes("manual review".toLowerCase()) || c.toLowerCase().includes("manual review"));
assert(c.includes("does not deploy, export, or prove runtime correctness"));
console.log("liveUIBuilderSourceSyncPanel.test.ts passed");
