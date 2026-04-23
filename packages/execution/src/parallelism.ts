export function chunkForParallelism<T>(items: T[], concurrency: number): T[][] {
  const safeConcurrency = Math.max(1, concurrency);
  const chunks: T[][] = Array.from({ length: safeConcurrency }, () => []);

  items.forEach((item, index) => {
    chunks[index % safeConcurrency].push(item);
  });

  return chunks.filter((chunk) => chunk.length > 0);
}

export async function runParallel<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const groups = chunkForParallelism(tasks, concurrency);
  const results: T[] = [];

  for (const group of groups) {
    const groupResults = await Promise.all(group.map((task) => task()));
    results.push(...groupResults);
  }

  return results;
}
