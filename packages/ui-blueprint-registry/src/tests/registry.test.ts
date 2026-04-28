import assert from "assert";
import {
  REQUIRED_UI_BLUEPRINT_IDS,
  assertValidUiBlueprintRegistry,
  getUiBlueprint,
  getUiBlueprintIds,
  listUiBlueprints,
} from "../index";

assert.doesNotThrow(() => assertValidUiBlueprintRegistry());

const ids = getUiBlueprintIds();

for (const requiredId of REQUIRED_UI_BLUEPRINT_IDS) {
  assert.ok(ids.includes(requiredId), `required UI blueprint missing: ${requiredId}`);
}

const uniqueCount = new Set(ids).size;
assert.equal(uniqueCount, ids.length, "UI blueprint IDs must be unique");

for (const blueprint of listUiBlueprints()) {
  assert.ok(blueprint.pages.length > 0, `blueprint ${blueprint.id} must have at least one page`);
  assert.ok(blueprint.components.length > 0, `blueprint ${blueprint.id} must have components`);
  assert.ok(blueprint.layoutZones.length > 0, `blueprint ${blueprint.id} must have layout zones`);
  assert.ok(blueprint.emptyStates.length > 0, `blueprint ${blueprint.id} must have empty states`);
  assert.ok(blueprint.loadingStates.length > 0, `blueprint ${blueprint.id} must have loading states`);
  assert.ok(blueprint.errorStates.length > 0, `blueprint ${blueprint.id} must have error states`);
  assert.ok(blueprint.responsiveBehavior.length > 0, `blueprint ${blueprint.id} must have responsive behavior`);
  assert.ok(blueprint.accessibilityRequirements.length > 0, `blueprint ${blueprint.id} must have accessibility requirements`);
  assert.ok(blueprint.noPlaceholderRules.length > 0, `blueprint ${blueprint.id} must have no-placeholder rules`);
}

assert.equal(getUiBlueprint("does-not-exist"), undefined, "unknown UI blueprint IDs should return undefined");

const listedIds = listUiBlueprints().map((blueprint) => blueprint.id);
const sortedIds = [...listedIds].sort((a, b) => a.localeCompare(b));
assert.deepEqual(listedIds, sortedIds, "listUiBlueprints should return stable sorted output");

console.log("ui-blueprint-registry registry.test.ts passed");
