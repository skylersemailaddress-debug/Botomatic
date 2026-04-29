import assert from "assert";
import fs from "fs";

const c = fs.readFileSync("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderInspectOverlay.tsx", "utf8");
assert(c.includes("data-live-ui-node-id"));
assert(c.includes("data-selected"));
assert(c.includes("data-changed"));
assert(c.includes("data-selectable"));
assert(c.includes("onSelectNode(nodeId)"));
console.log("liveUIBuilderInspectOverlay.test.ts passed");
