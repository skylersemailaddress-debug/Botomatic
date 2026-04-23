import { DEFAULT_RETRY_POLICY, shouldRetry } from "./retryPolicy";
import { exponentialBackoff, wait } from "./backoff";

export async function runWithRetry<T>(input: {
  task: () => Promise<T>;
  attempt?: number;
}) {
  let attempt = input.attempt ?? 0;
  let lastError: unknown;

  while (shouldRetry(attempt, DEFAULT_RETRY_POLICY)) {
    try {
      return await input.task();
    } catch (error) {
      lastError = error;
      const delay = exponentialBackoff(DEFAULT_RETRY_POLICY.backoffMs, attempt);
      await wait(delay);
      attempt += 1;
    }
  }

  throw lastError;
}
