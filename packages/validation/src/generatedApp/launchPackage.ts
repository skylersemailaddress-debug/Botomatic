export type LaunchPackageFile = {
  rel: string;
  content: string;
  encoding?: "utf8" | "base64";
};

export type RunCheckpoint = {
  runId: string;
  currentStep: string;
  completedSteps: string[];
  failedStep: string | null;
  retryCommand: string;
  artifactPaths: string[];
  logs: string[];
  resumeInstruction: string;
};

export type MilestoneDefinition = {
  milestoneId: string;
  name: string;
  goal: string;
  dependencies: string[];
  requiredSpecs: string[];
  outputArtifacts: string[];
  validators: string[];
  launchCriteria: string[];
};

export const REQUIRED_LAUNCH_PACKAGE_FILES = [
  "launch/README_LAUNCH.md",
  "launch/ONE_CLICK_LOCAL_LAUNCH.md",
  "launch/SECRETS_SETUP.md",
  "launch/CLOUD_DEPLOY.md",
  "launch/DEPLOYMENT_PREFLIGHT.md",
  "launch/ROLLBACK.md",
  "launch/SMOKE_TESTS.md",
  "launch/launch-local.sh",
  "launch/launch-local.ps1",
  "launch/install-desktop-launcher-linux.sh",
  "launch/install-desktop-launcher-windows.ps1",
  "launch/app.desktop",
  "launch/app.ico",
  "launch/app.png",
  "launch/env.example",
  "launch/secret-requirements.json",
  "launch/deployment-targets.json",
  "launch/launch_packet.json",
  "launch/run_checkpoint.json",
  "launch/milestones.json",
];

export const SECRET_LIKE_PATTERNS: RegExp[] = [
  /sk_live_[0-9a-zA-Z]{10,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/,
];

const APP_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=";
const APP_ICO_BASE64 = "AAABAAEAEBAAAAAAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function containsSecretLikeValue(text: string): boolean {
  return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(text));
}

export function createRunCheckpoint(input: {
  runId: string;
  currentStep: string;
  completedSteps: string[];
  retryCommand: string;
  artifactPaths: string[];
  logs: string[];
  failedStep?: string | null;
}): RunCheckpoint {
  return {
    runId: input.runId,
    currentStep: input.currentStep,
    completedSteps: input.completedSteps,
    failedStep: input.failedStep ?? null,
    retryCommand: input.retryCommand,
    artifactPaths: input.artifactPaths,
    logs: input.logs,
    resumeInstruction: `Resume by rerunning: ${input.retryCommand}`,
  };
}

export function createMilestonePlan(input: {
  appName: string;
  domainId: string;
  validators: string[];
}): MilestoneDefinition[] {
  return [
    {
      milestoneId: `${input.domainId}_foundation`,
      name: "Foundation",
      goal: `Establish ${input.appName} structure, routes, secrets references, and local launch path.`,
      dependencies: [],
      requiredSpecs: ["product intent", "build contract", "launch package"],
      outputArtifacts: ["launch/README_LAUNCH.md", "launch/env.example", "launch/run_checkpoint.json"],
      validators: ["Validate-GeneratedAppLaunchPackage"],
      launchCriteria: ["local launcher exists", "secret requirements declared", "resume hint written"],
    },
    {
      milestoneId: `${input.domainId}_integration`,
      name: "Integration",
      goal: `Wire core integrations and deployment targets for ${input.appName} without performing live deploys.`,
      dependencies: [`${input.domainId}_foundation`],
      requiredSpecs: ["integration contract", "deployment targets", "smoke tests"],
      outputArtifacts: ["launch/CLOUD_DEPLOY.md", "launch/deployment-targets.json", "launch/SMOKE_TESTS.md"],
      validators: input.validators,
      launchCriteria: ["deployment targets declared", "smoke tests documented", "approval gates preserved"],
    },
    {
      milestoneId: `${input.domainId}_launch`,
      name: "Launch Gate",
      goal: `Package ${input.appName} for local launch and approval-gated cloud deployment handoff.`,
      dependencies: [`${input.domainId}_integration`],
      requiredSpecs: ["rollback plan", "launch packet", "validator summary"],
      outputArtifacts: ["launch/ROLLBACK.md", "launch/launch_packet.json", "launch/ONE_CLICK_LOCAL_LAUNCH.md"],
      validators: input.validators,
      launchCriteria: ["launch docs complete", "validator set declared", "deployment remains approval-gated"],
    },
  ];
}

export function buildLaunchPackageFiles(input: {
  appName: string;
  domainId: string;
  localLaunchCommand: string;
  localLaunchPowerShellCommand: string;
  secretRequirements: Array<{ providerId: string; environment: string; keyName: string; required: boolean; secretUri: string }>;
  deploymentTargets: Array<{ id: string; label: string; approvalRequired: true; credentialed: true; liveBlockedByDefault: true }>;
  validators: string[];
  artifactPaths: string[];
  logs: string[];
}): LaunchPackageFile[] {
  const checkpoint = createRunCheckpoint({
    runId: `${input.domainId}_launch_run`,
    currentStep: "local_launch_ready",
    completedSteps: ["launch_docs_written", "secrets_declared", "deployment_targets_declared"],
    retryCommand: input.localLaunchCommand,
    artifactPaths: input.artifactPaths,
    logs: input.logs,
  });
  const milestones = createMilestonePlan({
    appName: input.appName,
    domainId: input.domainId,
    validators: input.validators,
  });

  return [
    {
      rel: "launch/README_LAUNCH.md",
      content: `# ${input.appName} Launch\n\nLaunch locally first. Cloud deployment remains credentialed and approval-gated.\n\nResume hint: ${checkpoint.resumeInstruction}\n`,
    },
    {
      rel: "launch/ONE_CLICK_LOCAL_LAUNCH.md",
      content: `# One-Click Local Launch\n\nRun:\n\n\`${input.localLaunchCommand}\`\n\nThis is the default supported launch path.\n`,
    },
    {
      rel: "launch/SECRETS_SETUP.md",
      content: "# Secrets Setup\n\nUse secret references only. Example URI format: secret://provider/environment/KEY_NAME\n\nNo plaintext secret values belong in the repo.\n",
    },
    {
      rel: "launch/CLOUD_DEPLOY.md",
      content: "# Cloud Deploy\n\nCloud deployment is credentialed and approval-gated. Prepare secrets, review preflight, then use the declared provider workflow. No live deployment is executed by this package by default.\n",
    },
    {
      rel: "launch/DEPLOYMENT_PREFLIGHT.md",
      content: "# Deployment Preflight\n\nCheck required secrets, smoke tests, rollback plan, and approval status before any cloud handoff. Missing required secrets must block live execution.\n",
    },
    {
      rel: "launch/ROLLBACK.md",
      content: "# Rollback\n\nKeep a known-good artifact, verify smoke failures, then revert to the previous stable release using the target-specific rollback process.\n",
    },
    {
      rel: "launch/SMOKE_TESTS.md",
      content: "# Smoke Tests\n\nRun health, auth boundary, and primary workflow checks immediately after local launch or approved deployment handoff.\n",
    },
    {
      rel: "launch/launch-local.sh",
      content: `#!/usr/bin/env bash\nset -euo pipefail\nnpm install\n${input.localLaunchCommand}\n`,
    },
    {
      rel: "launch/launch-local.ps1",
      content: `$ErrorActionPreference = "Stop"\nnpm install\n${input.localLaunchPowerShellCommand}\n`,
    },
    {
      rel: "launch/install-desktop-launcher-linux.sh",
      content: `#!/usr/bin/env bash\nset -euo pipefail\nROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"\nmkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"\ncat > "$HOME/.local/bin/${input.domainId}" <<EOF\n#!/usr/bin/env bash\ncd "$ROOT_DIR"\n${input.localLaunchCommand}\nEOF\nchmod +x "$HOME/.local/bin/${input.domainId}"\ncp "$ROOT_DIR/launch/app.desktop" "$HOME/.local/share/applications/${input.domainId}.desktop"\n`,
    },
    {
      rel: "launch/install-desktop-launcher-windows.ps1",
      content: `$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path\n$Launcher = Join-Path $RootDir "launch\\launch-local.ps1"\n$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "${input.appName}.lnk"\n$WshShell = New-Object -ComObject WScript.Shell\n$Shortcut = $WshShell.CreateShortcut($DesktopShortcut)\n$Shortcut.TargetPath = "powershell.exe"\n$Shortcut.Arguments = "-ExecutionPolicy Bypass -File \"$Launcher\""\n$Shortcut.WorkingDirectory = $RootDir\n$Shortcut.Save()\n`,
    },
    {
      rel: "launch/app.desktop",
      content: `[Desktop Entry]\nType=Application\nName=${input.appName}\nExec=bash -lc '${input.localLaunchCommand}'\nIcon=app.png\nTerminal=true\nCategories=Development;\n`,
    },
    {
      rel: "launch/app.ico",
      content: APP_ICO_BASE64,
      encoding: "base64",
    },
    {
      rel: "launch/app.png",
      content: APP_PNG_BASE64,
      encoding: "base64",
    },
    {
      rel: "launch/env.example",
      content: input.secretRequirements.map((item) => `${item.keyName}=replace_at_runtime`).join("\n") + "\n",
    },
    {
      rel: "launch/secret-requirements.json",
      content: JSON.stringify({
        noPlaintextRepoStorage: true,
        secrets: input.secretRequirements,
      }, null, 2),
    },
    {
      rel: "launch/deployment-targets.json",
      content: JSON.stringify({
        targets: input.deploymentTargets,
      }, null, 2),
    },
    {
      rel: "launch/launch_packet.json",
      content: JSON.stringify({
        validators: input.validators,
        localLaunchDefault: true,
        cloudDeploymentApprovalRequired: true,
        cloudDeploymentCredentialed: true,
        representativeNotExhaustive: true,
        resumeHint: checkpoint.resumeInstruction,
      }, null, 2),
    },
    {
      rel: "launch/run_checkpoint.json",
      content: JSON.stringify(checkpoint, null, 2),
    },
    {
      rel: "launch/milestones.json",
      content: JSON.stringify(milestones, null, 2),
    },
  ];
}
