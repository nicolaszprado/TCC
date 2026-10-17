export const DATABASE_POOL_POLICY = {
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
} as const;
