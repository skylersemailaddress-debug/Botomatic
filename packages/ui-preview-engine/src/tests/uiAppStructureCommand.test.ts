import assert from "node:assert/strict";
import { parseUIAppStructureCommand, resolveUIPageReference } from "../uiAppStructureCommands";
import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";
assert.equal(parseUIAppStructureCommand('add a pricing page').status,'ok');
assert.equal(parseUIAppStructureCommand('rename pricing to plans').status,'ok');
assert.equal(parseUIAppStructureCommand('duplicate the home page').status,'ok');
assert.equal(parseUIAppStructureCommand('make this hero reusable').status,'ok');
assert.equal(parseUIAppStructureCommand('add this section to every page').status,'ok');
assert.equal(parseUIAppStructureCommand('add pricing to the nav').status,'ok');

const fx = createUIPreviewInteractionFixture();
const byId = resolveUIPageReference(fx.doc, fx.doc.pages[0].id); assert.equal(byId.status, 'resolved');
const byTitle = resolveUIPageReference(fx.doc, fx.doc.pages[0].title); assert.equal(byTitle.status, 'resolved');
const byRoute = resolveUIPageReference(fx.doc, fx.doc.pages[0].route); assert.equal(byRoute.status, 'resolved');
const ambiguousDoc = { ...fx.doc, pages: [...fx.doc.pages, { ...fx.doc.pages[0], id: `${fx.doc.pages[0].id}-x`, route: `${fx.doc.pages[0].route}-x` }] };
assert.equal(resolveUIPageReference(ambiguousDoc as any, fx.doc.pages[0].title).status, 'needsResolution');
console.log('ok uiAppStructureCommand');
