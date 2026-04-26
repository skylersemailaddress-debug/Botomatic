import fs from "fs";
import net from "net";
import path from "path";
import { spawnSync } from "child_process";

type Status = "OK" | "FIXED" | "NEEDS USER";

type DoctorCheck = {
  label: string;
  status: Status;
  detail: string;
  blocking?: boolean;
};

const ROOT = process.cwd();
const REQUIRED_PROOFS = [
  "release-evidence/runtime/greenfield_runtime_proof.json",
  "release-evidence/runtime/multi_domain_emitted_output_proof.json",
  "release-evidence/runtime/secrets_credential_management_readiness_proof.json",
];

function commandExists(command: string): boolean {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], { cwd: ROOT, encoding: "utf8" });
  return (result.status ?? 1) === 0;
}

function readPackageJson(): any {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
}

function checkNodeVersion(): DoctorCheck {
  const version = process.version;
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return {
    label: "Node version",
    status: major >= 20 ? "OK" : "NEEDS USER",
    detail: major >= 20 ? `${version} detected.` : `${version} detected. Node 20+ is recommended.`,
    blocking: true,
  };
}

function checkNpmVersion(): DoctorCheck {
  const result = spawnSync("npm", ["--version"], { cwd: ROOT, encoding: "utf8" });
  const version = (result.stdout || "").trim() || "unknown";
  return {
    label: "npm version",
    status: (result.status ?? 1) === 0 ? "OK" : "NEEDS USER",
    detail: (result.status ?? 1) === 0 ? `${version} detected.` : "npm is not available.",
    blocking: true,
  };
}

function checkGit(): DoctorCheck {
  return {
    label: "Git availability",
    status: commandExists("git") ? "OK" : "NEEDS USER",
    detail: commandExists("git") ? "git command is available." : "git command is missing.",
    blocking: true,
  };
}

function checkInstallState(): DoctorCheck {
  const installed = fs.existsSync(path.join(ROOT, "node_modules"));
  return {
    label: "Package install state",
    status: installed ? "OK" : "NEEDS USER",
    detail: installed ? "node_modules present." : "Dependencies are not installed. Run npm install or use npm run start:easy.",
    blocking: false,
  };
}

function checkControlPlaneScripts(): DoctorCheck {
  const scripts = readPackageJson().scripts || {};
  const required = ["control-plane:dev", "ui:build", "validate:all", "doctor", "start:easy"];
  const missing = required.filter((key) => !scripts[key]);
  return {
    label: "Control-plane scripts",
    status: missing.length === 0 ? "OK" : "NEEDS USER",
    detail: missing.length === 0 ? "Required startup and validation scripts are present." : `Missing scripts: ${missing.join(", ")}`,
    blocking: true,
  };
}

function checkEnvFiles(): DoctorCheck {
  const envExample = fs.existsSync(path.join(ROOT, ".env.example"));
  const nextEnvExample = fs.existsSync(path.join(ROOT, "apps/control-plane/.env.example"));
  return {
    label: "Required env file status",
    status: envExample || nextEnvExample ? "OK" : "NEEDS USER",
    detail: envExample || nextEnvExample
      ? "Environment example file found. Real values remain user-supplied and uncommitted."
      : "No .env.example found at repo root or control-plane app.",
    blocking: false,
  };
}

function checkPort(port: number): Promise<DoctorCheck> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve({
        label: `Port ${port} availability`,
        status: "NEEDS USER",
        detail: `Port ${port} is already in use. Stop the conflicting process before launch.`,
        blocking: true,
      });
    });
    server.once("listening", () => {
      server.close(() => {
        resolve({
          label: `Port ${port} availability`,
          status: "OK",
          detail: `Port ${port} is available.`,
          blocking: true,
        });
      });
    });
    server.listen(port, "127.0.0.1");
  });
}

function checkWritePermissions(): DoctorCheck {
  const tmpPath = path.join(ROOT, ".doctor-write-test");
  try {
    fs.writeFileSync(tmpPath, "ok", "utf8");
    fs.rmSync(tmpPath, { force: true });
    return {
      label: "Write permissions",
      status: "OK",
      detail: "Repository root is writable.",
      blocking: true,
    };
  } catch {
    return {
      label: "Write permissions",
      status: "NEEDS USER",
      detail: "Repository root is not writable for the current user.",
      blocking: true,
    };
  }
}

function checkLauncherInstalled(): DoctorCheck {
  const launcherPath = path.join(process.env.HOME || "", ".local", "bin", "botomatic");
  const desktopPath = path.join(process.env.HOME || "", ".local", "share", "applications", "botomatic.desktop");
  const installed = fs.existsSync(launcherPath) && fs.existsSync(desktopPath);
  return {
    label: "Launcher installed status",
    status: installed ? "OK" : "NEEDS USER",
    detail: installed ? `Launcher present at ${launcherPath}.` : "Desktop launcher is not installed yet. Run install/install-linux.sh on Linux.",
    blocking: false,
  };
}

function checkProofArtifacts(): DoctorCheck {
  const missing = REQUIRED_PROOFS.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  return {
    label: "Proof artifact presence",
    status: missing.length === 0 ? "OK" : "NEEDS USER",
    detail: missing.length === 0 ? "Required proof artifacts are present." : `Missing proof artifacts: ${missing.join(", ")}`,
    blocking: false,
  };
}

function checkValidatorCommand(): DoctorCheck {
  const scripts = readPackageJson().scripts || {};
  return {
    label: "Validator command availability",
    status: scripts["validate:all"] ? "OK" : "NEEDS USER",
    detail: scripts["validate:all"] ? "validate:all script is available." : "validate:all script is missing.",
    blocking: true,
  };
}

function checkRepoPath(): DoctorCheck {
  const ok = fs.existsSync(path.join(ROOT, "package.json")) && fs.existsSync(path.join(ROOT, "apps/control-plane"));
  return {
    label: "Repo path",
    status: ok ? "OK" : "NEEDS USER",
    detail: ok ? `Botomatic repo detected at ${ROOT}.` : "Current directory does not look like the Botomatic repo root.",
    blocking: true,
  };
}

function detectEnvironment(): DoctorCheck {
  const release = fs.existsSync("/etc/os-release") ? fs.readFileSync("/etc/os-release", "utf8") : "";
  const isChrome = /chromeos/i.test(release) || fs.existsSync("/dev/.cros_milestone");
  return {
    label: "Environment detection",
    status: "OK",
    detail: isChrome ? "Chromebook/Linux environment detected." : `${process.platform} environment detected.`,
    blocking: false,
  };
}

async function main() {
  const checks: DoctorCheck[] = [
    detectEnvironment(),
    checkRepoPath(),
    checkNodeVersion(),
    checkNpmVersion(),
    checkGit(),
    checkInstallState(),
    checkControlPlaneScripts(),
    checkEnvFiles(),
    await checkPort(3000),
    await checkPort(3001),
    checkWritePermissions(),
    checkLauncherInstalled(),
    checkProofArtifacts(),
    checkValidatorCommand(),
  ];

  console.log("\nBotomatic Doctor\n");
  for (const check of checks) {
    console.log(`${check.status.padEnd(10)} ${check.label}`);
    console.log(`  ${check.detail}`);
  }

  const failing = checks.filter((check) => check.status === "NEEDS USER" && check.blocking);
  const advisory = checks.filter((check) => check.status === "NEEDS USER" && !check.blocking);
  console.log("\nSummary:");
  console.log(`  OK: ${checks.filter((check) => check.status === "OK").length}`);
  console.log(`  FIXED: ${checks.filter((check) => check.status === "FIXED").length}`);
  console.log(`  NEEDS USER: ${checks.filter((check) => check.status === "NEEDS USER").length}`);

  if (advisory.length > 0) {
    console.log("\nAdvisory items do not block local launch:");
    for (const check of advisory) {
      console.log(`  - ${check.label}`);
    }
  }

  if (failing.length > 0) {
    process.exit(1);
  }
}

void main();