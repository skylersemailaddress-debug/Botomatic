import { GitHubAdapter, GitBranchRecord } from "./types";

export const MockGitHubAdapter: GitHubAdapter = {
  async createBranch(input): Promise<GitBranchRecord> {
    return {
      projectId: input.projectId,
      packetId: input.packetId,
      branchName: input.branchName,
      prUrl: `https://github.com/mock/${input.projectId}/pull/1`,
      commitSha: "mocksha123",
      status: "opened_pr"
    };
  }
};
