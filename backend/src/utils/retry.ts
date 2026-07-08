export interface RetryOptions {
  retries: number;
  baseDelayMs?: number;
  onAttemptFail?: (attempt: number, error: unknown) => void;
}

/**
 * Runs `fn`, retrying on failure with exponential backoff + jitter.
 * Used to make AI batch calls resilient to transient rate limits /
 * network errors without hammering the provider.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries, baseDelayMs = 800, onAttemptFail }: RetryOptions
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      onAttemptFail?.(attempt + 1, err);
      if (attempt === retries) break;
      const jitter = Math.random() * 200;
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
