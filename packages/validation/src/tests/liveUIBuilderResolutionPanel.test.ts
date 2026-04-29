import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderResolutionPanel.tsx", "utf8");
assert(c.includes("label"));
assert(c.includes("type"));
assert(c.includes("page"));
assert(c.includes("location"));
assert(c.includes("onResolve"));
console.log("liveUIBuilderResolutionPanel.test.ts passed");
