export function planUIScalabilityChunks(args: { orderedFiles: string[]; operationCount: number; maxChunkSize?: number }) {
  const orderedFiles = [...(args.orderedFiles ?? [])];
  const maxChunkSize = Math.max(1, args.maxChunkSize ?? 5);
  const chunkCount = Math.max(1, Math.ceil(Math.max(orderedFiles.length, args.operationCount, 1) / maxChunkSize));
  const chunks: { chunkId: string; files: string[]; operationBudget: number }[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const files = orderedFiles.filter((_, idx) => idx % chunkCount === i);
    const operationBudget = Math.ceil(args.operationCount / chunkCount);
    chunks.push({ chunkId: `scalability-chunk-${i}`, files, operationBudget });
  }
  return { chunks, chunkCount, averageChunkSize: orderedFiles.length / chunkCount, maxChunkSize };
}
