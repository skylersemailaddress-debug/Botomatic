import assert from "assert"
import fs from "fs"
import { createUIGeneratedAppRuntimeSmokePlan } from "../uiGeneratedAppRuntimeSmokePlanner"

const a = createUIGeneratedAppRuntimeSmokePlan({ target: "vite-react", projectPath: "x/package.json", packageManager: "npm", startCommand: "dev" })
const b = createUIGeneratedAppRuntimeSmokePlan({ target: "vite-react", projectPath: "x/package.json", packageManager: "npm", startCommand: "dev" })
assert.strictEqual(a.smokeRunId, b.smokeRunId)
assert(a.steps.length === 8)
assert(createUIGeneratedAppRuntimeSmokePlan({ target: "unknown", projectPath: "x" }).blockedReasons.includes("unknown target"))
assert(createUIGeneratedAppRuntimeSmokePlan({ target: "vite-react", projectPath: "../x", packageManager: "npm", startCommand: "dev" }).blockedReasons.includes("unsafe projectPath traversal"))
assert(createUIGeneratedAppRuntimeSmokePlan({ target: "next-app", projectPath: "x/package.json", packageManager: "yarn", startCommand: "dev" }).blockedReasons.includes("unsupported package manager"))
const plannerText = fs.readFileSync(new URL("../uiGeneratedAppRuntimeSmokePlanner.ts", import.meta.url), "utf8")
for (const bad of ["child_process", "spawn(", "exec(", "fetch(", "axios", "XMLHttpRequest"]) assert(!plannerText.includes(bad))
console.log("uiGeneratedAppRuntimeSmokePlanner.test.ts passed")
