import assert from "assert";
import { UI_FULL_PROJECT_GENERATION_CAVEAT } from "../uiFullProjectGenerationPlan";

assert(UI_FULL_PROJECT_GENERATION_CAVEAT.includes("deterministic dry-run planning"));
assert(UI_FULL_PROJECT_GENERATION_CAVEAT.includes("does not write files"));
console.log("uiFullProjectGenerationPlan.test.ts passed");
