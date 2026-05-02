import assert from "assert";
import fs from "fs";

const vibe = fs.readFileSync("apps/control-plane/src/components/commercial/CommercialVibeCockpit.tsx", "utf8");
const pro = fs.readFileSync("apps/control-plane/src/components/commercial/CommercialProCockpit.tsx", "utf8");

const requiredVibeBindings = [
  "onSubmit={(event)",
  "submitOperatorPrompt(",
  "handleActionChip(\"Improve Design\")",
  "handleActionChip(\"Add Page\")",
  "handleActionChip(\"Add Feature\")",
  "handleActionChip(\"Connect Payments\")",
  "handleActionChip(\"Run Tests\")",
  "handleLaunch()",
  "Launch unavailable"
];

for (const token of requiredVibeBindings) {
  assert(vibe.includes(token), `commercial vibe button binding missing token: ${token}`);
}

const requiredProBindings = [
  "handleRun()",
  "handleLaunch()",
  "handleDeploy()",
  "handleCopilotSend()",
  "Quick actions unavailable",
  "Open Preview unavailable"
];

for (const token of requiredProBindings) {
  assert(pro.includes(token), `commercial pro button binding missing token: ${token}`);
}

console.log("buttonActionBinding.test.ts passed");
