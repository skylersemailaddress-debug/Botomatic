import { type UIScalabilityChunkPlan, type UIScalabilityIndexPlan, type UIScalabilityPaginationPlan } from "./uiScalabilityPerformanceModel";

export function createUIScalabilityChunkPlan(input: { documentNodeCount: number; sourceFiles: Record<string, string>; operationCount: number; nodeChunkSize?: number; byteBudget?: number; operationChunkSize?: number }): UIScalabilityChunkPlan {
  const nodeChunkSize = input.nodeChunkSize ?? 250;
  const byteBudget = input.byteBudget ?? 256 * 1024;
  const operationChunkSize = input.operationChunkSize ?? 100;
  const documentChunks = Array.from({ length: Math.ceil(input.documentNodeCount / nodeChunkSize) }, (_, i) => ({ startNodeIndex: i * nodeChunkSize, endNodeIndex: Math.min(input.documentNodeCount - 1, (i + 1) * nodeChunkSize - 1) })).filter((c) => c.endNodeIndex >= c.startNodeIndex);
  const paths = Object.keys(input.sourceFiles).sort((a, b) => a.localeCompare(b));
  const sourceFileChunks: { filePaths: string[]; totalBytes: number }[] = [];
  let bucket: string[] = []; let bucketBytes = 0;
  for (const p of paths) { const bytes = Buffer.byteLength(input.sourceFiles[p] ?? "", "utf8"); if (bucket.length && bucketBytes + bytes > byteBudget) { sourceFileChunks.push({ filePaths: bucket, totalBytes: bucketBytes }); bucket = []; bucketBytes = 0; } bucket.push(p); bucketBytes += bytes; }
  if (bucket.length) sourceFileChunks.push({ filePaths: bucket, totalBytes: bucketBytes });
  const operationChunks = Array.from({ length: Math.ceil(input.operationCount / operationChunkSize) }, (_, i) => ({ startOperationIndex: i * operationChunkSize, endOperationIndex: Math.min(input.operationCount - 1, (i + 1) * operationChunkSize - 1) })).filter((c) => c.endOperationIndex >= c.startOperationIndex);
  return { documentChunks, sourceFileChunks, operationChunks, recommendedChunkCount: documentChunks.length + sourceFileChunks.length + operationChunks.length };
}

export function createUIScalabilityIndexPlan(counts: { documentNodeCount: number; sourceFileCount: number; identityCount: number; dependencyCount: number }): UIScalabilityIndexPlan {
  const recommendations = [
    { key: "nodeId", enabled: counts.documentNodeCount > 500, reason: "node count threshold" },
    { key: "filePath", enabled: counts.sourceFileCount > 100, reason: "file count threshold" },
    { key: "sourceIdentity", enabled: counts.identityCount > 500, reason: "identity count threshold" },
    { key: "dependencyGraph", enabled: counts.dependencyCount > 100, reason: "dependency count threshold" }
  ];
  return { recommendations, recommendedIndexCount: recommendations.filter((r) => r.enabled).length };
}

export function createUIScalabilityPaginationPlan(counts: { changedFilesCount: number; operationCount: number; identityCount: number; dependencyCount: number; repairAttemptCount: number }): UIScalabilityPaginationPlan {
  const recommendations = ["changedFiles", "operations", "identities", "dependencies", "repairAttempts"].map((key) => ({ key, enabled: ({ changedFiles: counts.changedFilesCount, operations: counts.operationCount, identities: counts.identityCount, dependencies: counts.dependencyCount, repairAttempts: counts.repairAttemptCount } as any)[key] > 100, count: ({ changedFiles: counts.changedFilesCount, operations: counts.operationCount, identities: counts.identityCount, dependencies: counts.dependencyCount, repairAttempts: counts.repairAttemptCount } as any)[key] }));
  return { recommendations, recommendedPaginationCount: recommendations.filter((r) => r.enabled).length };
}
