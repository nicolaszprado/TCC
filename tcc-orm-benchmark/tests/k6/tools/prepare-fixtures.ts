import { readFile, access } from 'node:fs/promises';
import { client, counts, db, fixturePath, hash, jsonFile, positive, type Fixture, type Product } from './common.js';

async function main(): Promise<void> {
  const writes = process.argv.includes('--writes');
  if (process.argv.slice(2).some((arg) => arg !== '--writes')) throw new Error('Usage: prepare-fixtures.ts [--writes]');
  const maxVus = positive(process.env.MAX_VUS, 100, 'MAX_VUS');
  const budget = positive(process.env.MAX_ORDERS_PER_VU, 100000, 'MAX_ORDERS_PER_VU');
  const quantity = positive(process.env.QUANTITY, 1, 'QUANTITY');
  if (maxVus > 100 || budget * quantity > 2147483647) throw new Error('MAX_VUS <= 100 and stock <= INTEGER required');
  if (writes && (process.env.ALLOW_WRITES !== 'true' || process.env.BENCHMARK_DB_CONFIRM !== db.database)) {
    throw new Error('Write preparation requires ALLOW_WRITES=true and BENCHMARK_DB_CONFIRM matching DB_NAME');
  }
  // Never silently replace a preparation whose mutations may still be in the database.
  try { await access(fixturePath); throw new Error(`Fixture already exists: ${fixturePath}. Archive it and restore the baseline before preparing again.`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const metadata = JSON.parse(await readFile('database/metadata/dataset.json', 'utf8'));
  const connection = client();
  await connection.connect();
  try {
    await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await connection.query('SELECT pg_advisory_xact_lock(730031)');
    const actual = await counts(connection);
    for (const key of Object.keys(actual)) {
      if (actual[key] !== metadata[key]) throw new Error(`Dataset mismatch: ${key} database=${actual[key]}, metadata=${metadata[key]}. Restore baseline explicitly.`);
    }
    const products = (await connection.query(`SELECT p.id::float8 AS id, p.category_id::float8 AS "categoryId",
      p.price::text, p.stock, p.active, (d.product_id IS NOT NULL) AS "hasDetails"
      FROM products p LEFT JOIN product_details d ON d.product_id = p.id ORDER BY p.id`)).rows as Product[];
    const orders = (await connection.query(`SELECT o.id::float8 AS id, o.customer_id::float8 AS "customerId",
      o.status, count(i.id)::integer AS "itemCount" FROM orders o LEFT JOIN order_items i ON i.order_id=o.id
      GROUP BY o.id ORDER BY o.id`)).rows as Fixture['orders'];
    const customers = (await connection.query('SELECT id::float8 AS id FROM customers ORDER BY id')).rows.map((r) => r.id as number);
    for (const id of [...products.map((p) => p.id), ...orders.map((o) => o.id), ...customers]) {
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Fixtures require positive safe-integer IDs');
    }
    if (!products.length || !customers.length || !orders.length || orders.some((o) => o.itemCount < 1)) throw new Error('Dataset must contain products, customers and orders with items');
    const active = products.filter((p) => p.active && Number(p.price) >= 10 && Number(p.price) <= 5000);
    const pending = orders.find((o) => o.status === 'PENDING');
    if (!active.length || !pending) throw new Error('No data for filtered profiles');
    const itemDistribution: Record<string, number> = {};
    for (const o of orders) itemDistribution[o.itemCount] = (itemDistribution[o.itemCount] || 0) + 1;
    const f: Omit<Fixture, 'hash'> = {
      version: 1, preparedAt: new Date().toISOString(), dataset: metadata.dataset, seed: metadata.seed,
      database: { host: db.host, port: db.port, name: db.database, version: (await connection.query('SHOW server_version')).rows[0].server_version },
      counts: actual, products, orders, customers, itemDistribution,
      filters: { categoryId: active[0]!.categoryId, customerId: pending.customerId },
    };
    if (writes) {
      if (active.length < maxVus * 4) throw new Error('Not enough active products for exclusive VU partitions');
      f.writes = { maxVus, budget, quantity, orderMaxId: orders[orders.length - 1]!.id,
        partitions: Array.from({ length: maxVus }, (_, i) => ({
          customerId: customers[i % customers.length]!, products: active.slice(i * 3, i * 3 + 3).map((p) => ({ ...p, stock: budget * quantity })),
          patch: { ...active[maxVus * 3 + i]! },
        })) };
      const ids = f.writes.partitions.flatMap((p) => p.products.map((p) => p.id));
      await connection.query('UPDATE products SET stock=$1 WHERE id=ANY($2::bigint[])', [budget * quantity, ids]);
      // Save original product stocks in products; prepared stocks live in write partitions.
    }
    // Write the recovery manifest before commit. Any failure is visible; do not auto-reset user data.
    await jsonFile(fixturePath, { ...f, hash: hash(f) });
    await connection.query('COMMIT');
    console.log(`Prepared ${metadata.dataset}: ${products.length} products, ${orders.length} orders. Writes=${writes}. ${fixturePath}`);
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally { await connection.end(); }
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
