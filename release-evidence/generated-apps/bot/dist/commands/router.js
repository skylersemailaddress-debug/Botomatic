"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeCommand = routeCommand;
function routeCommand(input) { return input.startsWith('/deploy') ? 'deploy' : 'general'; }
