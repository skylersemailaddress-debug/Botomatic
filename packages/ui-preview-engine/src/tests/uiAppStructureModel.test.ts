import assert from "node:assert/strict";
import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";
import { createUIAppStructureFromDocument, normalizeUIRoutePath, validateUIAppStructure } from "../uiAppStructureModel";

assert.equal(normalizeUIRoutePath("Pricing"), "/pricing");
assert.equal(normalizeUIRoutePath("pricing"), "/pricing");
assert.equal(normalizeUIRoutePath("/pricing"), "/pricing");
assert.equal(normalizeUIRoutePath("Pricing Plans"), "/pricing-plans");
assert.equal(normalizeUIRoutePath("///Pricing///Plans///"), "/pricing/plans");
assert.equal(normalizeUIRoutePath("   "), null);

const fx = createUIPreviewInteractionFixture();
const s1 = createUIAppStructureFromDocument(fx.doc); const s2 = createUIAppStructureFromDocument(fx.doc);
assert.deepEqual(s1, s2);
assert.equal(validateUIAppStructure(s1).valid, true);
const broken = { ...s1, pages: [...s1.pages, s1.pages[0]], routes: [...s1.routes, s1.routes[0]] };
assert.equal(validateUIAppStructure(broken as any).valid, false);
console.log('ok uiAppStructureModel');
