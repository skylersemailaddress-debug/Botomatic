import assert from "assert";
import path from "path";
import { validateLocalCrossPlatformLaunchReadiness } from "../repoValidators/localCrossPlatformLaunchReadiness";

const root = path.resolve(__dirname, "../../../..");
const result = validateLocalCrossPlatformLaunchReadiness(root);
assert.strictEqual(result.status, "passed", result.summary);
console.log("localCrossPlatformLaunchReadiness.test.ts passed");
