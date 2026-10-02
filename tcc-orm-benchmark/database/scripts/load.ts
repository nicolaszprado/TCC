import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

type DatasetMetadata = {
  categories: number;
  products: number;
  productDetails: number;
  customers: number;
  orders: number;
  orderItems: number;
};

const projectRoot = process.cwd();
const csvDirectory = join(projectRoot, 'database', 'seed', 'output');
const metadataPath = join(projectRoot, 'database', 'metadata', 'dataset.json');

const tables = [
  { table: 'categories', columns: ['id', 'name', 'description', 'created_at'], metadata: 'categories' },
  { table: 'products', columns: ['id', 'category_id', 'name', 'description', 'price', 'stock', 'active', 'created_at', 'updated_at'], metadata: 'products' },
  { table: 'product_details', columns: ['product_id', 'weight_kg', 'width_cm', 'height_cm', 'depth_cm', 'manufacturer', 'warranty_months'], metadata: 'productDetails' },
  { table: 'customers', columns: ['id', 'name', 'email', 'created_at'], metadata: 'customers' },
  { table: 'orders', columns: ['id', 'customer_id', 'status', 'created_at', 'updated_at'], metadata: 'orders' },
  { table: 'order_items', columns: ['id', 'order_id', 'product_id', 'quantity', 'unit_price'], metadata: 'orderItems' },
] as const;

async function copyCsv(client: Client, table: (typeof tables)[number]): Promise<void> {
  const copy = client.query(copyFrom(`COPY ${table.table} (${table.columns.join(", ")}) FROM STDIN WITH (FORMAT csv, HEADER true)`) as never) as unknown as NodeJS.WritableStream;
  await new Promise<void>((resolve, reject) => {
    createReadStream(join(csvDirectory, `${table.table}.csv`))
      .on('error', reject)
      .pipe(copy)
      .on('error', reject)
      .on('finish', resolve);
  });
}

async function main(): Promise<void> {
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as DatasetMetadata;
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const table of tables) await copyCsv(client, table);
    for (const table of ['categories', 'products', 'customers', 'orders', 'order_items']) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
    }
    for (const table of tables) {
      const result = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table.table}`);
      const actual = Number(result.rows[0]!.count);
      const expected = metadata[table.metadata];
      if (actual !== expected) throw new Error(`${table.table}: expected ${expected}, got ${actual}.`);
      console.log(`${table.table}: ${actual.toLocaleString('en-US')}`);
    }
    const integrity = await client.query<{ missing_category: string; missing_product: string }>(`
      SELECT
        (SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE c.id IS NULL)::text AS missing_category,
        (SELECT COUNT(*) FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE p.id IS NULL)::text AS missing_product
    `);
    if (integrity.rows[0]!.missing_category !== '0' || integrity.rows[0]!.missing_product !== '0') {
      throw new Error('Foreign-key integrity validation failed.');
    }
    await client.query('COMMIT');
    console.log('Dataset loaded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
