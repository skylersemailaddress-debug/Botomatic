import assert from "assert";
import { validateNoPlaceholders } from "../validateNoPlaceholders";

const ok = validateNoPlaceholders("Production workflow implementation complete.");
assert.equal(ok.ok, true, "clean source should pass no-placeholder validation");

const bad = validateNoPlaceholders("TODO: fake auth flow with throw new Error(\"not implemented\")");
assert.equal(bad.ok, false, "placeholder tokens should fail validation");
assert.ok(bad.issues.length >= 1, "placeholder issues should be reported");

console.log("noPlaceholder.test.ts passed");
