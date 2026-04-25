export type SandboxPolicy = {
  allowedWriteRoots: string[];
  allowNetwork: boolean;
  allowedHosts: string[];
  allowShell: boolean;
  blockedCommands: string[];
};

export const defaultSandboxPolicy: SandboxPolicy = {
  allowedWriteRoots: ["/workspaces/Botomatic"],
  allowNetwork: true,
  allowedHosts: ["github.com", "registry.npmjs.org"],
  allowShell: true,
  blockedCommands: ["rm -rf /", "git reset --hard", "git checkout --"],
};
