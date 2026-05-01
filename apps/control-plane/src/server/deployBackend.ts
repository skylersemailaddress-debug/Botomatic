import fs from 'node:fs';
import path from 'node:path';
import { sanitizeProjectId } from './executionStore';

function repoRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

const ROOT = repoRoot(process.cwd());
const DEPLOY_ROOT = path.join(ROOT, 'data', 'deployments');

export function ensureDeployRoot() {
  fs.mkdirSync(DEPLOY_ROOT, { recursive: true });
}

export function writeDeploymentArtifact(projectId: string, payload: unknown) {
  ensureDeployRoot();
  const file = path.join(DEPLOY_ROOT, `${sanitizeProjectId(projectId)}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}
