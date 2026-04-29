import assert from "node:assert/strict";import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";import { applyUIAppStructureCommand } from "../uiAppStructureMutation";
const fx=createUIPreviewInteractionFixture();
const add=applyUIAppStructureCommand(fx.doc,{type:'addPage',title:'Pricing'} as any,{idSeed:'t'}); assert.equal(add.status,'applied');
const dup=applyUIAppStructureCommand(add.document,{type:'duplicatePage',pageRef:add.document.pages[0].id} as any,{idSeed:'t'}); assert.equal(dup.status,'applied');
const ren=applyUIAppStructureCommand(add.document,{type:'renamePage',from:'Pricing',to:'Plans'} as any); assert.equal(ren.status,'applied');
const rm=applyUIAppStructureCommand({...fx.doc,pages:[fx.doc.pages[0]]},{type:'removePage',pageRef:fx.doc.pages[0].id} as any); assert.equal(rm.status,'blocked');
console.log('ok uiAppStructureMutation');
