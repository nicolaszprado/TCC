import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { client, counts, readFixtures, jsonFile } from './common.js';

async function main(): Promise<void> {
  const reportPath = process.argv[2];
  if (!reportPath) throw new Error('Usage: verify-writes.ts <summary.json>');
  const f = await readFixtures();
  if (!f.writes) throw new Error('No write preparation');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const meta = report.metadata;
  if (meta.fixtureHash !== f.hash || !['create-order', 'update-product-stock'].includes(meta.endpoint)) throw new Error('Summary and fixtures do not match');
  const failures: string[] = [];
  const assert = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
  const exit = JSON.parse(await readFile(join(dirname(reportPath), 'exit.json'), 'utf8'));
  assert(exit.exitCode === 0, 'k6 did not finish successfully (aborted or failed thresholds)');
  assert(report.metrics.checks?.values?.rate === 1, 'Response checks failed');
  assert(report.metrics.http_req_failed?.values?.rate === 0, 'HTTP failures occurred');
  const metric = (name: string) => Number(report.metrics[name]?.values?.count ?? 0);
  assert(metric('business_attempts') > 0, 'No requests executed');
  assert(metric('business_attempts') === metric('business_successes'), 'Some requests failed contract/status checks');
  const connection = client();
  await connection.connect();
  try {
    await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const after = await counts(connection);
    const created = meta.endpoint === 'create-order' ? metric('business_successes') : 0;
    assert(after.orders === f.counts.orders! + created, 'Unexpected order count');
    assert(after.orderItems === f.counts.orderItems! + created * meta.items, 'Unexpected order-item count');
    const ids = f.writes.partitions.flatMap((p) => [...p.products.map((p) => p.id), p.patch.id]);
    const stocks = new Map((await connection.query('SELECT id::float8 AS id, stock FROM products WHERE id=ANY($1::bigint[])', [ids])).rows.map((p) => [p.id, p.stock]));
    let vuSuccessTotal = 0;
    for (let i = 0; i < f.writes.partitions.length; i++) {
      const p = f.writes.partitions[i]!;
      const attempts = metric(`business_attempts{vu_id:${i + 1}}`);
      const successes = metric(`business_successes{vu_id:${i + 1}}`);
      vuSuccessTotal += successes;
      assert(attempts === successes, `VU ${i + 1}: request failure`);
      for (let j = 0; j < p.products.length; j++) {
        const product = p.products[j]!;
        const consumed = meta.endpoint === 'create-order' && j < meta.items ? successes * meta.quantity : 0;
        assert(stocks.get(product.id) === product.stock - consumed, `Stock mismatch for product ${product.id}`);
      }
      const expectedPatch = meta.endpoint === 'update-product-stock' && attempts > 0 ? 100 + ((attempts - 1) % 2) : p.patch.stock;
      assert(stocks.get(p.patch.id) === expectedPatch, `PATCH final stock mismatch for ${p.patch.id}`);
    }
    assert(vuSuccessTotal === metric('business_successes'), 'Missing per-VU metrics');
    if (created > 0) {
      const rows = (await connection.query(`SELECT count(*)::integer AS n FROM orders WHERE id > $1 AND status <> 'PENDING'`, [f.writes.orderMaxId])).rows;
      assert(rows[0].n === 0, 'Unexpected created order status');
    }
    await connection.query('COMMIT');
    const result = { verifiedAt: new Date().toISOString(), fixtureHash: f.hash, reportPath, valid: failures.length === 0, failures, before: f.counts, after };
    await jsonFile(reportPath.replace(/\.json$/, '') + '-verification.json', result);
    console.log(JSON.stringify(result, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally { await connection.end(); }
}
main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
