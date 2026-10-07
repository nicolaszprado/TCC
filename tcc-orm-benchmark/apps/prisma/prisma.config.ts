import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const applicationDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(applicationDirectory, '../.env'), quiet: true });

const user = encodeURIComponent(process.env.DB_USER ?? 'postgres');
const password = encodeURIComponent(process.env.DB_PASSWORD ?? 'postgres');
const host = process.env.DB_HOST ?? 'localhost';
const port = process.env.DB_PORT ?? '5432';
const database = encodeURIComponent(process.env.DB_NAME ?? 'TCC_STORE_DATABASE');

export default defineConfig({
  schema: resolve(applicationDirectory, 'prisma/schema.prisma'),
  datasource: {
    url: `postgresql://${user}:${password}@${host}:${port}/${database}`,
  },
});
