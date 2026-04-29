import assert from "node:assert/strict";import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";import { applyUIAppStructureCommand } from "../uiAppStructureMutation";
const fx=createUIPreviewInteractionFixture();
const add=applyUIAppStructureCommand(fx.doc,{type:'addPage',title:'Pricing'} as any,{idSeed:'t'}); assert.equal(add.status,'applied');
const addDup=applyUIAppStructureCommand(add.document,{type:'addPage',title:'pricing'} as any,{idSeed:'t'}); assert.equal(addDup.status,'blocked');
const ren=applyUIAppStructureCommand(add.document,{type:'renamePage',from:'pricing',to:'Plans'} as any); assert.equal(ren.status,'applied');
const dup=applyUIAppStructureCommand(add.document,{type:'duplicatePage',pageRef:'pricing'} as any,{idSeed:'t'}); assert.equal(dup.status,'applied');
const rm=applyUIAppStructureCommand({...fx.doc,pages:[fx.doc.pages[0]]},{type:'removePage',pageRef:fx.doc.pages[0].id} as any); assert.equal(rm.status,'blocked');
const nav=applyUIAppStructureCommand(add.document,{type:'updateNavigation',entryRef:'pricing'} as any); assert.equal(nav.status,'applied');
const extracted=applyUIAppStructureCommand(fx.doc,{type:'extractComponent',nodeRef:Object.keys(fx.doc.pages[0].nodes)[0],title:'Hero'} as any,{selectedNodeId:Object.keys(fx.doc.pages[0].nodes)[0], now:fx.now}); assert.equal(extracted.status,'applied');
const reused=applyUIAppStructureCommand(extracted.document,{type:'reuseComponent',componentRef:'reusable:hero',pageRef:fx.doc.pages[0].id} as any,{idSeed:'t',now:fx.now}); assert.equal(reused.status,'applied');
console.log('ok uiAppStructureMutation');
// duplicate route path should be blocked
