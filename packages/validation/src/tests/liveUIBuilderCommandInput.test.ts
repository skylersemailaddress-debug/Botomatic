import assert from "assert";
import fs from "fs";
const c = fs.readFileSync("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderCommandInput.tsx", "utf8");
assert(c.includes("Enter a command first."));
assert(c.includes("setValue(\"\")"));
assert(c.includes("Could not parse command"));
console.log("liveUIBuilderCommandInput.test.ts passed");
