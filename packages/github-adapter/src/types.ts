export interface GitBranchRecord {
  projectId: string;
  packetId: string;
  branchName: string;
  prUrl?: string;
  commitSha?: string;
  status: "created" | "pushed" | "opened_pr" | "merged" | "failed";
}

export interface GitHubAdapter {
  createBranch(input: {
    projectId: string;
    packetId: string;
    branchName: string;
  }): Promise<GitBranchRecord>;
}
