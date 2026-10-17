import { setTimeout as delay } from 'node:timers/promises';

export const TRANSACTION_ISOLATION_SQL = 'SERIALIZABLE' as const;
export const TRANSACTION_ISOLATION_PRISMA = 'Serializable' as const;
export const MAX_TRANSACTION_ATTEMPTS = 3;
export const TRANSACTION_RETRY_BACKOFF_MS = 10;

export async function runWithTransactionRetry<T>(
  operation: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
      await delay(TRANSACTION_RETRY_BACKOFF_MS * attempt);
    }
  }

  throw new Error('Transaction retry loop exhausted unexpectedly.');
}
