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

function isSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
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

  async getBranchHead(branchName?: string) {
    const refName = branchName || this.opts.baseBranch || "main";
    const ref = await ghRequest(
      `${this.base}/git/ref/heads/${refName}`,
      { method: "GET" },
      this.opts.token
    );

    const commitSha = ref.object.sha as string;
    const commit = await ghRequest(
      `${this.base}/git/commits/${commitSha}`,
      { method: "GET" },
      this.opts.token
    );

    return {
      branch: refName,
      commitSha,
      treeSha: commit.tree.sha as string,
    };
  }

  async commitFiles(branchName: string, message: string, files: { path: string; content: string }[]) {
    const head = await this.getBranchHead(branchName);

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

    if (blobs.length !== files.length) {
      throw new Error(
        `Blob count mismatch: files=${files.length} blobs=${blobs.length}`
      );
    }

    const treeEntries = files.map((f, i) => {
      const blobSha = blobs[i]?.sha;

      if (!isSha(blobSha)) {
        throw new Error(
          `Invalid blob sha at index ${i}: ${JSON.stringify({
            file: f.path,
            blob: blobs[i] ?? null,
            allBlobs: blobs,
          })}`
        );
      }

      return {
        path: f.path,
        mode: "100644",
        type: "blob",
        sha: blobSha,
      };
    });

    const treePayload = {
      base_tree: head.treeSha,
      tree: treeEntries,
    };

    let tree;
    try {
      tree = await ghRequest(
        `${this.base}/git/trees`,
        {
          method: "POST",
          body: JSON.stringify(treePayload),
        },
        this.opts.token
      );
    } catch (error: any) {
      throw new Error(
        `Tree creation failed: ${String(error?.message || error)} | payload=${JSON.stringify(treePayload)}`
      );
    }

    const commit = await ghRequest(
      `${this.base}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [head.commitSha],
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
