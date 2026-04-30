import assert from "assert";
import { classifyUIRepairFailures } from "../uiReliabilityFailureClassifier";
const cases:any[]=[
{stderr:"SyntaxError: Unexpected token",expect:"parse-error"},{stderr:"TS2322: Type string is not assignable",expect:"type-error"},{stderr:"next.js build failed",expect:"build-error"},{stderr:"AssertionError: expected 1 to equal 2",expect:"test-error"},{stderr:"eslint: lint error",expect:"lint-error"},{stderr:"stale identity mismatch",expect:"source-identity-stale"},{stderr:"beforeSnippet mismatch",expect:"patch-conflict"},{stderr:"ENOENT: no such file",expect:"missing-file"},{stderr:"protected path blocked operation",expect:"unsafe-operation"},{stderr:"weird",expect:"unknown"}
];
for (const c of cases){const out=classifyUIRepairFailures([{stderr:c.stderr}]);assert.equal(out[0].kind,c.expect);}
assert.doesNotThrow(()=>classifyUIRepairFailures([null as any]));
assert.equal(classifyUIRepairFailures([null as any])[0].confidence,"low");
console.log("uiReliabilityFailureClassifier tests passed");
