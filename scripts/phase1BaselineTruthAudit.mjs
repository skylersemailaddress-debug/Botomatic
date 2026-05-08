import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const logDir = path.join(root, "audit", "baseline", "logs");
fs.mkdirSync(logDir, { recursive: true });

const baselineEnv = {
  ...process.env,
  RUNTIME_MODE: process.env.RUNTIME_MODE || "development",
  BOTOMATIC_DEPLOYMENT_ENV: process.env.BOTOMATIC_DEPLOYMENT_ENV || "local",
  PROJECT_REPOSITORY_MODE: process.env.PROJECT_REPOSITORY_MODE || "memory",
  QUEUE_BACKEND: process.env.QUEUE_BACKEND || "memory",
  BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
  BOTOMATIC_LOCAL_TEST_AUTH: "true",
};

const gates = [
  ["01", "npm-ci", ["npm", ["ci"]]],
  ["02", "deps-sanity", ["npm", ["run", "deps:sanity"]]],
  ["03", "lint", ["npm", ["run", "lint"]]],
  ["04", "typecheck", ["npm", ["run", "typecheck"]]],
  ["05", "build", ["npm", ["run", "build"]]],
  ["06", "test", ["npm", ["run", "test"]]],
  ["07", "validate-all", ["npm", ["run", "validate:all"]]],
  ["08", "proof-all", ["npm", ["run", "proof:all"]]],
  ["09", "beta-readiness", ["npm", ["run", "beta:readiness"]]],
  ["10", "commercial-launch", ["npm", ["run", "validate:commercial-launch"]]],
];

const summary = [];
let failed = false;

for (const [index, name, command] of gates) {
  const [bin, args] = command;
  const label = `${index}-${name}`;
  const logPath = path.join(logDir, `${label}.log`);
  const exitPath = path.join(logDir, `${label}.exit`);

  console.log(`::group::${label}`);
  console.log(`Running: ${bin} ${args.join(" ")}`);

  const result = spawnSync(bin, args, {
    cwd: root,
    env: baselineEnv,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const code = result.status ?? 1;
  const output = `${stdout}${stderr ? `\n${stderr}` : ""}`;

  fs.writeFileSync(logPath, output);
  fs.writeFileSync(exitPath, `${code}\n`);

  const tail = output.split(/\r?\n/).slice(-80).join("\n");
  if (tail.trim()) console.log(tail);
  console.log(`Exit code: ${code}`);
  console.log("::endgroup::");

  summary.push({ label, code });
  if (code !== 0) failed = true;
}

const summaryLines = summary.map(({ label, code }) => `audit/baseline/logs/${label}.exit: ${code}`);
fs.writeFileSync(path.join(logDir, "exit-summary.txt"), `${summaryLines.join("\n")}\n`);
fs.writeFileSync(path.join(logDir, "baseline-suite.exit"), `${failed ? 1 : 0}\n`);

console.log("Baseline exit summary:");
for (const line of summaryLines) console.log(line);
console.log(`Baseline suite status: ${failed ? 1 : 0}`);

process.exit(failed ? 1 : 0);
