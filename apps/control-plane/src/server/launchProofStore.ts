/**
 * WAVE-038: Server-side launch proof store.
 * 
 * Tracks verified launch proofs per project. A launch proof must:
 * 1. Be verified via benchmark/runtime/commercial readiness proof
 * 2. Be explicitly submitted via /api/projects/[projectId]/launch-proof
 * 3. Not be faked or derived from preview URLs
 * 
 * Hard rule: Launch/deploy controls unlock only when launchProof.verified === true
 * and launchReady === true.
 */

import fs from "fs";
import path from "path";

export type LaunchProof = {
  projectId: string;
  verified: boolean;
  verifiedAt?: string;
  verificationMethod?: "benchmark" | "runtime" | "commercial_readiness" | "manual";
  buildStatus?: string;
  commercialReadinessScore?: number;
  lastUpdated: string;
};

export class LaunchProofStore {
  private storeDir: string;

  constructor(storeDir: string = process.cwd()) {
    this.storeDir = path.join(storeDir, ".botomatic", "launch-proofs");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.storeDir)) {
      fs.mkdirSync(this.storeDir, { recursive: true });
    }
  }

  private getProofPath(projectId: string): string {
    return path.join(this.storeDir, `${projectId}.json`);
  }

  async getProof(projectId: string): Promise<LaunchProof | null> {
    try {
      const proofPath = this.getProofPath(projectId);
      if (!fs.existsSync(proofPath)) {
        return null;
      }
      const content = fs.readFileSync(proofPath, "utf8");
      return JSON.parse(content) as LaunchProof;
    } catch {
      return null;
    }
  }

  async setProof(projectId: string, proof: Partial<LaunchProof>): Promise<LaunchProof> {
    const existing = await this.getProof(projectId);
    const updated: LaunchProof = {
      projectId,
      verified: proof.verified ?? existing?.verified ?? false,
      verifiedAt: proof.verifiedAt ?? existing?.verifiedAt,
      verificationMethod: proof.verificationMethod ?? existing?.verificationMethod,
      buildStatus: proof.buildStatus ?? existing?.buildStatus,
      commercialReadinessScore: proof.commercialReadinessScore ?? existing?.commercialReadinessScore,
      lastUpdated: new Date().toISOString(),
    };

    const proofPath = this.getProofPath(projectId);
    fs.writeFileSync(proofPath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async clearProof(projectId: string): Promise<void> {
    const proofPath = this.getProofPath(projectId);
    if (fs.existsSync(proofPath)) {
      fs.unlinkSync(proofPath);
    }
  }

  async getAllProofs(): Promise<LaunchProof[]> {
    try {
      if (!fs.existsSync(this.storeDir)) {
        return [];
      }
      const files = fs.readdirSync(this.storeDir);
      const proofs: LaunchProof[] = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(this.storeDir, file), "utf8");
          proofs.push(JSON.parse(content) as LaunchProof);
        }
      }
      return proofs;
    } catch {
      return [];
    }
  }
}

// Singleton instance
let storeInstance: LaunchProofStore | null = null;

export function getProofStore(): LaunchProofStore {
  if (!storeInstance) {
    storeInstance = new LaunchProofStore();
  }
  return storeInstance;
}
