import { setTimeout as delay } from 'node:timers/promises';

export const TRANSACTION_ISOLATION_SQL = 'SERIALIZABLE' as const;
export const TRANSACTION_ISOLATION_PRISMA = 'Serializable' as const;
export const MAX_TRANSACTION_ATTEMPTS = 8;
export const TRANSACTION_RETRY_BACKOFF_MS = 10;

function retryDelayMs(attempt: number): number {
  const exponentialBackoff = TRANSACTION_RETRY_BACKOFF_MS * (2 ** (attempt - 1));
  // A proportional jitter prevents aborted transactions from retrying in lockstep.
  return exponentialBackoff + Math.floor(Math.random() * (exponentialBackoff + 1));
}

export async function runWithTransactionRetry<T>(
  operation: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
      await delay(retryDelayMs(attempt));
    }
  }

  throw new Error('Transaction retry loop exhausted unexpectedly.');
}
