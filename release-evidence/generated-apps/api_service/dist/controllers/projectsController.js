"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjects = getProjects;
const projects_1 = require("../routes/projects");
function getProjects() { return (0, projects_1.listProjects)(); }
