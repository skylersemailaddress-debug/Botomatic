#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const result = spawnSync("npx", ["tsx", "scripts/proof-orchestration-core-runner.ts"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
