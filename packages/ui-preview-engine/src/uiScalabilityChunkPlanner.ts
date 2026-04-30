export function planUIScalabilityChunks(args: { orderedFiles: string[]; operationCount: number; maxChunkSize?: number }) {
  const orderedFiles = [...(args.orderedFiles ?? [])].sort();
  const configuredMaxChunkSize = Math.max(1, args.maxChunkSize ?? 5);
  const chunkCount = Math.max(1, Math.ceil(Math.max(orderedFiles.length, args.operationCount, 1) / configuredMaxChunkSize));
  const chunks: { chunkId: string; files: string[]; operationBudget: number }[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const files = orderedFiles.filter((_, idx) => idx % chunkCount === i);
    const operationBudget = Math.ceil(args.operationCount / chunkCount);
    chunks.push({ chunkId: `scalability-chunk-${i}`, files, operationBudget });
  }
  const observedMaxChunkSize = chunks.reduce((max, chunk) => Math.max(max, chunk.files.length), 0);
  return {
    chunks,
    chunkCount,
    averageChunkSize: orderedFiles.length / chunkCount,
    maxChunkSize: observedMaxChunkSize,
    configuredMaxChunkSize
  };
}
