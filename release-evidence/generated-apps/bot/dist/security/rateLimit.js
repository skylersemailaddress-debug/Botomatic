"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowRequest = allowRequest;
function allowRequest(key, count) { return count < 120; }
