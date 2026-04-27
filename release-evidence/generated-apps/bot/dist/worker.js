"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tick = tick;
const router_1 = require("./commands/router");
function tick(input) { return (0, router_1.routeCommand)(input); }
