import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_TRANSACTION_ATTEMPTS,
  runWithTransactionRetry,
  TRANSACTION_ISOLATION_PRISMA,
  TRANSACTION_ISOLATION_SQL,
} from './transaction-policy.js';

describe('shared transaction policy', () => {
  it('represents SERIALIZABLE for each library API', () => {
    assert.equal(TRANSACTION_ISOLATION_SQL, 'SERIALIZABLE');
    assert.equal(TRANSACTION_ISOLATION_PRISMA, 'Serializable');
  });

  it('retries retryable failures up to the shared limit', async () => {
    let attempts = 0;
    const result = await runWithTransactionRetry(
      async () => {
        attempts += 1;
        if (attempts < MAX_TRANSACTION_ATTEMPTS) throw new Error('retryable');
        return 'created';
      },
      () => true,
    );

    assert.equal(result, 'created');
    assert.equal(attempts, MAX_TRANSACTION_ATTEMPTS);
  });

  it('does not retry non-retryable failures', async () => {
    let attempts = 0;
    await assert.rejects(
      runWithTransactionRetry(
        async () => {
          attempts += 1;
          throw new Error('fatal');
        },
        () => false,
      ),
      /fatal/,
    );
    assert.equal(attempts, 1);
  });
});
