import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const INSTALLER_FILES = [
  "install/install-linux.sh",
  "install/install-macos.sh",
  "install/install-windows.ps1",
  "install/doctor.sh",
  "install/repair-install.sh",
  "install/uninstall.sh",
  "install/README_INSTALL.md",
  "scripts/doctor.ts",
  "scripts/startEasy.ts",
  "package.json",
];

const LINUX_EXEC_FILES = [
  "install/install-linux.sh",
  "install/install-macos.sh",
  "install/doctor.sh",
  "install/repair-install.sh",
  "install/uninstall.sh",
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function isExecutableOnLinux(root: string, rel: string): boolean {
  const full = path.join(root, rel);
  try {
    const mode = fs.statSync(full).mode;
    return (mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-InstallerRuntimeReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateInstallerRuntimeReadiness(root: string): RepoValidatorResult {
  const checks = [...INSTALLER_FILES];

  for (const rel of checks) {
    if (!has(root, rel)) {
      return result(false, `Missing installer/runtime file: ${rel}`, checks);
    }
  }

  const linuxInstaller = read(root, "install/install-linux.sh");
  const macInstaller = read(root, "install/install-macos.sh");
  const windowsInstaller = read(root, "install/install-windows.ps1");
  const doctorShell = read(root, "install/doctor.sh");
  const repairShell = read(root, "install/repair-install.sh");
  const uninstallShell = read(root, "install/uninstall.sh");
  const startEasy = read(root, "scripts/startEasy.ts");
  const doctorTs = read(root, "scripts/doctor.ts");
  const installReadme = read(root, "install/README_INSTALL.md").toLowerCase();
  const pkg = JSON.parse(read(root, "package.json"));
  const scripts = pkg?.scripts || {};

  const linuxDoctorHook = linuxInstaller.includes("npm run doctor") || linuxInstaller.includes("install/doctor.sh");
  if (!linuxInstaller.startsWith("#!/usr/bin/env bash") || !linuxDoctorHook || !linuxInstaller.includes("npm run start:easy")) {
    return result(false, "Linux installer is missing required launcher/doctor anchors.", checks);
  }

  if (!macInstaller.startsWith("#!/usr/bin/env bash") || !macInstaller.includes("npm run start:easy")) {
    return result(false, "macOS installer is missing required launcher/start anchors.", checks);
  }

  if (!windowsInstaller.includes("npm run start:easy")) {
    return result(false, "Windows installer is missing easy-start launcher wiring.", checks);
  }

  if (!doctorShell.startsWith("#!/usr/bin/env bash") || !doctorShell.includes("npm run doctor")) {
    return result(false, "install/doctor.sh is missing doctor command wiring.", checks);
  }

  if (!repairShell.startsWith("#!/usr/bin/env bash") || !repairShell.includes("npm install") || !repairShell.includes("install/doctor.sh")) {
    return result(false, "install/repair-install.sh is missing repair + doctor flow.", checks);
  }

  const hasLauncherCleanup =
    uninstallShell.includes("$HOME/.local/bin/botomatic") ||
    uninstallShell.includes("~/.local/bin/botomatic");
  if (!uninstallShell.startsWith("#!/usr/bin/env bash") || !hasLauncherCleanup) {
    return result(false, "install/uninstall.sh is missing launcher cleanup.", checks);
  }

  const scriptsOk = Boolean(scripts["doctor"]) && Boolean(scripts["start:easy"]) && Boolean(scripts["start:easy:dry-run"]);
  if (!scriptsOk) {
    return result(false, "package scripts are missing doctor/start:easy/start:easy:dry-run.", checks);
  }

  const hasDryRun = startEasy.includes("--dry-run");
  const hasDoctorPrecheck =
    startEasy.includes("run(\"npm\", [\"run\", \"doctor\"], \"doctor\")") ||
    startEasy.includes("run('npm', ['run', 'doctor'], 'doctor')");
  if (!hasDryRun || !hasDoctorPrecheck) {
    return result(false, "scripts/startEasy.ts is missing dry-run or doctor precheck logic.", checks);
  }

  if (!doctorTs.includes("checkPort(3000)") || !doctorTs.includes("checkPort(3001)") || !doctorTs.includes("validate:all")) {
    return result(false, "scripts/doctor.ts is missing required local runtime checks.", checks);
  }

  if (!installReadme.includes("install") || !installReadme.includes("doctor") || !installReadme.includes("start:easy")) {
    return result(false, "install/README_INSTALL.md is missing required install/doctor/start guidance.", checks);
  }

  if (process.platform === "linux") {
    for (const rel of LINUX_EXEC_FILES) {
      if (!isExecutableOnLinux(root, rel)) {
        return result(false, `Installer script is not executable on Linux: ${rel}`, checks);
      }
    }
  }

  return result(
    true,
    "Installer runtime readiness is present: cross-platform installers, doctor/easy-start wiring, repair/uninstall flow, and Linux executable permissions are valid.",
    checks
  );
}
