import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  });

  await client.connect();
  try {
    await client.query(await readFile(join(process.cwd(), 'database', 'scripts', 'reset.sql'), 'utf8'));
    console.log('Database reset successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
