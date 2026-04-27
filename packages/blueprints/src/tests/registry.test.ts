import assert from "assert";
import { blueprintRegistry } from "../registry";

assert.ok(blueprintRegistry.length >= 26, "blueprint registry should have broad coverage");

for (const bp of blueprintRegistry) {
  assert.ok(bp.id.length > 0, "blueprint id required");
  assert.ok(bp.defaultPages.length > 0, `blueprint ${bp.id} pages required`);
  assert.ok(bp.defaultRoles.length > 0, `blueprint ${bp.id} roles required`);
  assert.ok(bp.defaultEntities.length > 0, `blueprint ${bp.id} entities required`);
  assert.ok(bp.validationRules.length > 0, `blueprint ${bp.id} validation rules required`);
  assert.ok(bp.noPlaceholderRules.length > 0, `blueprint ${bp.id} no-placeholder rules required`);
}

console.log("registry.test.ts passed");
