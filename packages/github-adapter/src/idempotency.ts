export function dedupeOperation<T>(existing: T | null, incoming: () => Promise<T>): Promise<T> {
  if (existing) return Promise.resolve(existing);
  return incoming();
}

export function shouldRetry(status?: string): boolean {
  return status === "failed";
}
