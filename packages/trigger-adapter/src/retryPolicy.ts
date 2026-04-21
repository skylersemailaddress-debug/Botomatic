export interface RetryDecision {
  shouldRetry: boolean;
  nextDelayMs: number;
}

export function getRetryDecision(retryCount: number, maxRetries = 3, baseDelayMs = 1000): RetryDecision {
  if (retryCount >= maxRetries) {
    return { shouldRetry: false, nextDelayMs: 0 };
  }

  return {
    shouldRetry: true,
    nextDelayMs: baseDelayMs * Math.pow(2, retryCount)
  };
}
