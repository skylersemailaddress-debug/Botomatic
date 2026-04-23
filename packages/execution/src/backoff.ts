export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function exponentialBackoff(base: number, attempt: number): number {
  return base * Math.pow(2, attempt);
}
