import assert from "assert";
import { normalizeAndValidateUIDataStateApiWiring, normalizeBindingName } from "../uiDataStateApiWiringNormalizer";

assert.strictEqual(normalizeBindingName("  User_Name Value!! "), "user-name-value");
const good = normalizeAndValidateUIDataStateApiWiring({
  bindings: [{ bindingId: "b1", bindingName: " User Name ", nodeId: "n1", propertyPath: "text.value", expression: "state.user.name" }],
  stateBindings: [{ stateKey: "count", initialValue: 0, scope: "local", nodeId: "n1", propertyPath: "text" }],
  stateActions: ["set","toggle","increment","decrement","reset","append","remove"].map((t, i) => ({ actionId: `a${i}`, actionType: t as any, stateKey: "count", payload: i })),
  apiEndpoints: [{ endpointId: "ep1", method: "GET", url: "/api/items" }, { endpointId: "ep2", method: "POST", url: "https://api.example.com/items", externalAllowed: true }, { endpointId: "ep3", method: "GET", url: "http://localhost:4000/api", devAllowed: true }],
  apiRequestBindings: [{ requestBindingId: "rb1", endpointId: "ep1", params: { q: "x" }, body: { x: 1 }, responseMappings: [{ propertyPath: "items", expression: "response.items" }] }]
});
assert.strictEqual(good.issues.length, 0);
const bad = normalizeAndValidateUIDataStateApiWiring({
  bindings: [{ bindingId: "b", nodeId: "", propertyPath: "", expression: "javascript:alert(1)" } as any],
  stateBindings: [{ stateKey: "", initialValue: "() => 1", scope: "global" as any }],
  stateActions: [{ actionId: "a", actionType: "mutate" as any, stateKey: "", payload: "function(){}" }],
  apiEndpoints: [{ endpointId: "", method: "GET", url: "http://bad.com", headers: { Authorization: "Bearer <required_secret_ref>" } }, { endpointId: "js", method: "GET", url: "javascript:alert(1)" }, { endpointId: "data", method: "GET", url: "data:text/plain,1" }, { endpointId: "file", method: "GET", url: "file:///tmp/a" }, { endpointId: "local", method: "GET", url: "http://127.0.0.1:3000" }],
  apiRequestBindings: [{ requestBindingId: "rb", endpointId: "missing", responseMappings: [{ propertyPath: "", expression: "<script>" }] } as any]
});
assert(bad.issues.length > 0);
assert(bad.issues.some((i) => i.message.includes("http:// rejected")));
assert(bad.issues.some((i) => i.message.includes("javascript:/data:/file: rejected")));
assert(bad.issues.some((i) => i.message.includes("localhost/127.0.0.1 rejected by default")));
assert(bad.issues.some((i) => i.message.includes("secret-looking header literal rejected")));
assert(bad.issues.some((i) => i.code === "unsupported-action"));
console.log("uiDataStateApiWiringNormalizer.test.ts passed");
