import assert from "node:assert/strict";import { parseUIAppStructureCommand } from "../uiAppStructureCommands";
assert.equal(parseUIAppStructureCommand('add a pricing page').status,'ok');
assert.equal(parseUIAppStructureCommand('rename pricing to plans').status,'ok');
assert.equal(parseUIAppStructureCommand('duplicate the home page').status,'ok');
assert.equal(parseUIAppStructureCommand('make this hero reusable').status,'ok');
assert.equal(parseUIAppStructureCommand('add this section to every page').status,'ok');
assert.equal(parseUIAppStructureCommand('add pricing to the nav').status,'ok');
console.log('ok uiAppStructureCommand');
