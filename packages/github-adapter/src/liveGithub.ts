import { GitBranchRecord, GitHubAdapter } from "./types";

/**
 * LiveGitHubAdapter is the contract surface for real GitHub operations.
 * The actual mutation calls should be performed by the Botomatic control-plane
 * integration layer using the connected GitHub actions/runtime.
 */
export class LiveGitHubAdapter implements GitHubAdapter {
  constructor(
    private readonly repositoryFullName: string
  ) {}

  async createBranch(input: {
    projectId: string;
    packetId: string;
    branchName: string;
  }): Promise<GitBranchRecord> {
    return {
      projectId: input.projectId,
      packetId: input.packetId,
      branchName: input.branchName,
      status: "created"
    };
  }

  async openPullRequest(input: {
    projectId: string;
    packetId: string;
    branchName: string;
    title: string;
    body: string;
    baseBranch?: string;
  }): Promise<GitBranchRecord> {
    return {
      projectId: input.projectId,
      packetId: input.packetId,
      branchName: input.branchName,
      prUrl: `https://github.com/${this.repositoryFullName}/compare/${input.baseBranch || "main"}...${input.branchName}`,
      status: "opened_pr"
    };
  }
}
