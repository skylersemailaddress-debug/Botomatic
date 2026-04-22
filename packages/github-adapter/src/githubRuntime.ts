export type GitHubRuntimeOptions = {
  token: string;
  owner: string;
  repo: string;
  baseBranch?: string;
};

async function ghRequest(url: string, options: RequestInit, token: string) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed ${res.status}: ${text}`);
  }

  return res.json();
}

export class GitHubRuntime {
  private base: string;

  constructor(private readonly opts: GitHubRuntimeOptions) {
    this.base = `https://api.github.com/repos/${opts.owner}/${opts.repo}`;
  }

  async createBranch(branchName: string, fromSha: string) {
    return ghRequest(
      `${this.base}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: fromSha,
        }),
      },
      this.opts.token
    );
  }

  async getDefaultBranchSha() {
    const repo = await ghRequest(this.base, { method: "GET" }, this.opts.token);
    const branch = repo.default_branch;
    const ref = await ghRequest(
      `${this.base}/git/ref/heads/${branch}`,
      { method: "GET" },
      this.opts.token
    );
    return ref.object.sha as string;
  }

  async commitFiles(branchName: string, message: string, files: { path: string; content: string }[]) {
    // Simplified: create blobs -> tree -> commit -> update ref
    const baseSha = await this.getDefaultBranchSha();

    const blobs = await Promise.all(
      files.map((f) =>
        ghRequest(
          `${this.base}/git/blobs`,
          {
            method: "POST",
            body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
          },
          this.opts.token
        )
      )
    );

    const tree = await ghRequest(
      `${this.base}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseSha,
          tree: files.map((f, i) => ({
            path: f.path,
            mode: "100644",
            type: "blob",
            sha: blobs[i].sha,
          })),
        }),
      },
      this.opts.token
    );

    const commit = await ghRequest(
      `${this.base}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [baseSha],
        }),
      },
      this.opts.token
    );

    await ghRequest(
      `${this.base}/git/refs/heads/${branchName}`,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: true }),
      },
      this.opts.token
    );

    return commit;
  }

  async createPullRequest(title: string, head: string, base?: string, body?: string) {
    return ghRequest(
      `${this.base}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          head,
          base: base || this.opts.baseBranch || "main",
          body,
        }),
      },
      this.opts.token
    );
  }
}
