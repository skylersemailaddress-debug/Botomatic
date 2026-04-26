"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const manifest_1 = require("./tools/manifest");
function runAgent(task) { return { task, tools: manifest_1.TOOL_MANIFEST.map(t => t.name) }; }
