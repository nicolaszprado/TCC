import { Pool } from 'pg';

import { DATABASE_POOL_POLICY } from '../../../shared/database-policy.js';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  ...DATABASE_POOL_POLICY,
});

if (process.env.SQL_AUDIT === 'true') {
  const query = pool.query.bind(pool);
  pool.query = new Proxy(query, {
    apply(target, thisArgument, argumentsList) {
      const queryInput = argumentsList[0];
      const text = typeof queryInput === 'string'
        ? queryInput
        : (queryInput as { text?: unknown } | undefined)?.text;
      console.error('[sql-audit][raw-sql]', typeof text === 'string' ? text : queryInput);
      return Reflect.apply(target, thisArgument, argumentsList);
    },
  }) as typeof pool.query;
}
