import assert from "assert";
import { UI_EXPORT_DEPLOY_CAVEAT } from "../uiExportDeployModel";
assert(UI_EXPORT_DEPLOY_CAVEAT.includes("deterministic dry-run planning"));
assert(UI_EXPORT_DEPLOY_CAVEAT.includes("does not build, package, upload"));
console.log("uiExportDeployModel.test.ts passed");
