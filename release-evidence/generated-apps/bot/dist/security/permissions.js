"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canRun = canRun;
function canRun(command, role) { return role === 'admin' || command !== 'deploy'; }
