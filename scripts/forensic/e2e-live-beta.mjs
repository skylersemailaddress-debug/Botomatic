import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const OUTPUT_DIR = path.join(process.cwd(), "receipts", "forensic-readiness");

function now() {
  return new Date().toISOString();
}

function runPlaywright({ grep = "", outputJsonPath, persistResult = true, runId = "" }) {
  return new Promise((resolve) => {
    const uniqueOutput = `/tmp/pw-artifacts-${runId || Date.now()}-${process.pid}`;
    const args = ["playwright", "test", "--config", "playwright.owner-launch.config.ts", "--reporter", "json", "--output", uniqueOutput];
    if (grep) {
      args.push("-g", grep);
    }

    const child = spawn("npx", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", async (code) => {
      const result = {
        code: code || 0,
        stdout,
        stderr,
      };

      if (persistResult) {
        await fs.writeFile(outputJsonPath, JSON.stringify(result, null, 2), "utf8");
      }
      resolve(result);
    });
  });
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const loops = Number(process.env.LIVE_BETA_LOOPS || "1");
  const workers = Math.max(1, Math.min(Number(process.env.LIVE_BETA_WORKERS || "1"), 20));
  const grep = process.env.LIVE_BETA_GREP || "";

  const iterations = [];
  let aborted = false;

  // Run loops in parallel batches of `workers` size
  for (let batch = 0; batch < loops && !aborted; batch += workers) {
    const batchSize = Math.min(workers, loops - batch);
    const batchIndices = Array.from({ length: batchSize }, (_, k) => batch + k + 1);

    const batchResults = await Promise.all(
      batchIndices.map((index) => {
        const resultPath = path.join(OUTPUT_DIR, `e2e-live-beta-loop-${String(index).padStart(4, "0")}.json`);
        const persistResult = loops <= 10;
        return runPlaywright({ grep, outputJsonPath: resultPath, persistResult, runId: String(index) }).then(async (run) => {
          let receipt = null;
          if (persistResult) {
            receipt = path.basename(resultPath);
          } else if (run.code !== 0) {
            await fs.writeFile(resultPath, JSON.stringify(run, null, 2), "utf8");
            receipt = path.basename(resultPath);
          }
          return { index, exitCode: run.code, receipt };
        });
      })
    );

    for (const result of batchResults) {
      iterations.push(result);
      if (result.exitCode !== 0) {
        aborted = true;
      }
    }
  }

  const failed = iterations.filter((item) => item.exitCode !== 0);
  const summary = {
    capturedAt: now(),
    loopsRequested: loops,
    loopsExecuted: iterations.length,
    grep: grep || null,
    failedCount: failed.length,
    pass: failed.length === 0,
    iterations,
  };

  const summaryJson = path.join(OUTPUT_DIR, `e2e-live-beta-summary-${loops}.json`);
  const summaryMd = path.join(OUTPUT_DIR, `e2e-live-beta-summary-${loops}.md`);

  await fs.writeFile(summaryJson, JSON.stringify(summary, null, 2), "utf8");

  const md = [
    `# E2E Live Beta Summary (${loops})`,
    "",
    `- Captured at: ${summary.capturedAt}`,
    `- Loops requested: ${summary.loopsRequested}`,
    `- Loops executed: ${summary.loopsExecuted}`,
    `- Failed count: ${summary.failedCount}`,
    `- Grep: ${summary.grep || "<none>"}`,
    "",
    "## Iterations",
    ...iterations.map((item) => `- loop ${item.index}: exit=${item.exitCode} receipt=${item.receipt}`),
  ].join("\n");

  await fs.writeFile(summaryMd, `${md}\n`, "utf8");

  if (!summary.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("e2e-live-beta failed", error);
  process.exitCode = 1;
});
