import 'dotenv/config';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type Product = { id: number; categoryId: number; price: string; active: boolean; stock: number; hasDetails: boolean };
export type Fixture = {
  version: number; hash: string; preparedAt: string; dataset: string; seed: number;
  database: { host: string; port: number; name: string; version: string };
  counts: Record<string, number>; products: Product[]; customers: number[];
  orders: { id: number; customerId: number; status: string; itemCount: number }[];
  filters: { categoryId: number; customerId: number };
  itemDistribution: Record<string, number>;
  writes?: { maxVus: number; budget: number; quantity: number; orderMaxId: number;
    partitions: { customerId: number; products: Product[]; patch: Product }[] };
};

export const fixturePath = resolve(process.env.FIXTURES_FILE || 'tests/k6/fixtures/benchmark.json');
export const db = {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'TCC_STORE_DATABASE', user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres', connectionTimeoutMillis: 5000,
};
export const client = () => new Client(db);
export const tables = { categories: 'categories', products: 'products', productDetails: 'product_details',
  customers: 'customers', orders: 'orders', orderItems: 'order_items' };
export const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
export async function readFixtures(): Promise<Fixture> {
  const f = JSON.parse(await readFile(fixturePath, 'utf8')) as Fixture;
  const { hash: saved, ...data } = f;
  if (saved !== hash(data)) throw new Error('Fixture hash mismatch; prepare again');
  if (f.database.host !== db.host || f.database.port !== db.port || f.database.name !== db.database) {
    throw new Error('Fixtures belong to a different database connection');
  }
  return f;
}
export async function jsonFile(path: string, data: unknown, exclusive = true): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', { flag: exclusive ? 'wx' : 'w' });
}
export async function counts(connection: Client): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const [key, table] of Object.entries(tables)) {
    result[key] = Number((await connection.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  }
  return result;
}
export function positive(raw: string | undefined, fallback: number, name: string): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  return value;
}
