import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

export type CachedValidatorResult = {
  name: string;
  hash: string;
  status: "passed" | "failed";
  summary: string;
  checks: string[];
  updatedAt: string;
};

type ValidatorCacheShape = {
  version: 1;
  updatedAt: string;
  validators: Record<string, CachedValidatorResult>;
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_PATH = path.join(CACHE_DIR, "validator-cache.json");

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function getValidatorCachePath(): string {
  return CACHE_PATH;
}

export function clearValidatorCache() {
  if (fs.existsSync(CACHE_PATH)) {
    fs.rmSync(CACHE_PATH, { force: true });
  }
}

export function readValidatorCache(): ValidatorCacheShape {
  if (!fs.existsSync(CACHE_PATH)) {
    return { version: 1, updatedAt: new Date(0).toISOString(), validators: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    if (parsed?.version !== 1 || typeof parsed?.validators !== "object") {
      return { version: 1, updatedAt: new Date(0).toISOString(), validators: {} };
    }
    return parsed as ValidatorCacheShape;
  } catch {
    return { version: 1, updatedAt: new Date(0).toISOString(), validators: {} };
  }
}

export function writeValidatorCache(entries: CachedValidatorResult[]) {
  ensureCacheDir();
  const current = readValidatorCache();
  const nextValidators = { ...current.validators };
  for (const entry of entries) {
    nextValidators[entry.name] = entry;
  }
  const next: ValidatorCacheShape = {
    version: 1,
    updatedAt: new Date().toISOString(),
    validators: nextValidators,
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(next, null, 2), "utf8");
}

export function computeChecksHash(root: string, checks: string[]): string {
  const hash = crypto.createHash("sha256");
  const uniqueChecks = Array.from(new Set(checks)).sort();

  for (const rel of uniqueChecks) {
    const full = path.join(root, rel);
    hash.update(rel);
    hash.update("\n");
    if (!fs.existsSync(full)) {
      hash.update("missing\n");
      continue;
    }

    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        hash.update("dir\n");
        continue;
      }

      const content = fs.readFileSync(full);
      hash.update(content);
      hash.update("\n");
    } catch {
      hash.update("unreadable\n");
    }
  }

  return hash.digest("hex");
}

export function toCachedResult(result: RepoValidatorResult, hash: string): CachedValidatorResult {
  return {
    name: result.name,
    hash,
    status: result.status,
    summary: result.summary,
    checks: result.checks,
    updatedAt: new Date().toISOString(),
  };
}
