import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { DATABASE_POOL_POLICY } from '../../../shared/database-policy.js';
import { PrismaClient } from '../generated/prisma/client.js';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  ...DATABASE_POOL_POLICY,
});

const adapter = new PrismaPg(pool);
const sqlAudit = process.env.SQL_AUDIT === 'true';

export const prisma = new PrismaClient({
  adapter,
  log: sqlAudit ? ['query'] : [],
});
