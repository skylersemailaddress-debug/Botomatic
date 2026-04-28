import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

const ROOT = process.cwd();

function run(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(`${label} failed.`);
  }
}

function commandExists(command: string): boolean {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], { cwd: ROOT, encoding: "utf8" });
  return (result.status ?? 1) === 0;
}

function openBrowser(url: string) {
  const browser = process.env.BROWSER;
  if (browser) {
    spawn(browser, [url], { cwd: ROOT, detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], { cwd: ROOT, detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", url], { cwd: ROOT, detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (commandExists("xdg-open")) {
    spawn("xdg-open", [url], { cwd: ROOT, detached: true, stdio: "ignore" }).unref();
  }
}

function dependenciesInstalled(): boolean {
  return fs.existsSync(path.join(ROOT, "node_modules"));
}

function resolveLaunchUrl(): string {
  const raw = process.env.BOTOMATIC_CONTROL_PLANE_URL || "http://localhost:3000";
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol || "http:";
    const hostname = parsed.hostname || "localhost";
    const port = parsed.port || "3000";
    return `${protocol}//${hostname}:${port}`;
  } catch {
    return "http://localhost:3000";
  }
}

function main() {
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--check");

  if (!dependenciesInstalled()) {
    console.log("Dependencies missing. Running npm install...");
    run("npm", ["install"], "npm install");
  }

  console.log("Running doctor...");
  run("npm", ["run", "doctor"], "doctor");

  if (dryRun) {
    console.log("Dry run complete. Doctor passed and startup prechecks are healthy.");
    return;
  }

  console.log("Starting Botomatic control plane...");
  const child = spawn("npm", ["run", "control-plane:dev"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });

  const launchUrl = resolveLaunchUrl();
  openBrowser(launchUrl);
  console.log(`Botomatic opening at ${launchUrl}`);
  console.log("Press Ctrl+C to stop the control plane.");

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

try {
  main();
} catch (error: any) {
  console.error(`start:easy failed: ${error?.message || "unknown error"}`);
  process.exit(1);
}
