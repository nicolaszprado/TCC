import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { configuration, isWrite, pickIndex } from './config.js';
import * as contract from './contracts.js';

const attempts = new Counter('business_attempts');
const successes = new Counter('business_successes');
const routes = {
  'get-product-by-id': 'GET /products/:id', 'list-products': 'GET /products',
  'get-product-details': 'GET /products/:id/details', 'get-customer-orders': 'GET /customers/:id/orders',
  'get-order-by-id': 'GET /orders/:id', 'list-orders': 'GET /orders',
  'create-order': 'POST /orders', 'update-product-stock': 'PATCH /products/:id/stock',
};

export function suite(endpoint, mode) {
  // Relative paths are resolved against this module, not the shell working directory.
  const read = () => JSON.parse(open(__ENV.FIXTURES_FILE || '../fixtures/benchmark.json'));
  const f = { ...new SharedArray('benchmark-metadata', () => {
    const { products, orders, customers, ...metadata } = read();
    return [metadata];
  })[0] };
  f.products = new SharedArray('benchmark-products', () => read().products);
  f.detailProducts = new SharedArray('benchmark-details', () => read().products.filter((p) => p.hasDetails));
  f.orders = new SharedArray('benchmark-orders', () => read().orders);
  f.customers = new SharedArray('benchmark-customers', () => read().customers);
  const c = configuration(endpoint, __ENV, f);
  const writes = isWrite(endpoint);
  if (writes && __ENV.RUNNER_MANAGED !== 'true') throw new Error('Use npm run k6:run for writes (preflight, exclusive run, verification)');
  const thresholds = { http_req_failed: ['rate==0'], checks: ['rate==1'], business_attempts: ['count>0'] };
  if (writes) {
    for (let vu = 1; vu <= f.writes.maxVus; vu++) {
      // Materialize per-VU counts for stock verification without storing every request.
      thresholds[`business_attempts{vu_id:${vu}}`] = ['count>=0'];
      thresholds[`business_successes{vu_id:${vu}}`] = ['count>=0'];
    }
  }
  const options = {
    thresholds, summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'min', 'max'],
    tags: { endpoint: routes[endpoint], profile: c.profile, phase: __ENV.PHASE || mode },
    ...(mode === 'smoke' ? (writes ? { vus: 1, iterations: 1 } : { vus: 1, duration: '10s' }) : {}),
  };
  const choose = (rows) => rows[pickIndex(rows.length, c.seed, __VU, __ITER)];

  function run() {
    const vu = exec.vu.idInTest;
    if (writes && (!f.writes.partitions[vu - 1] || __ITER >= c.budget)) {
      exec.test.abort('Write partition or budget exhausted; restore and prepare a new run');
      return;
    }
    let method = 'GET';
    let path;
    let payload;
    let validate;
    const page = c.profile === 'paginated'
      ? 1 + pickIndex(Math.min(10, Math.ceil(c.total / c.limit)), c.seed, vu, __ITER) : c.page;
    if (endpoint === 'get-product-by-id' || endpoint === 'get-product-details') {
      const p = choose(c.products);
      path = `/products/${p.id}${endpoint === 'get-product-details' ? '/details' : ''}`;
      validate = (b) => b?.id === p.id && (endpoint === 'get-product-details' ? contract.details(b) : contract.product(b));
    } else if (endpoint === 'get-order-by-id') {
      const o = choose(c.orders);
      path = `/orders/${o.id}`;
      validate = (b) => contract.order(b) && b.id === o.id && b.items.length === o.itemCount && b.customer.id === o.customerId;
    } else if (endpoint === 'get-customer-orders') {
      const customer = choose(c.customers);
      path = `/customers/${customer.id}/orders?page=${page}&limit=${c.limit}`;
      validate = (b) => contract.customerOrders(b, customer.id, page, c.limit, customer.total);
    } else if (endpoint.startsWith('list-')) {
      const products = endpoint === 'list-products';
      const query = { page, limit: c.limit, ...c.filters };
      path = `/${products ? 'products' : 'orders'}?${Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
      validate = (b) => contract.pagination(b?.pagination, b?.data, page, c.limit, c.total)
        && b.data.every((row) => {
          if (products) return contract.product(row) && (c.profile !== 'filtered'
            || (row.categoryId === c.filters.categoryId && String(row.active) === c.filters.active
              && Number(row.price) >= Number(c.filters.minPrice) && Number(row.price) <= Number(c.filters.maxPrice)));
          return contract.order(row) && (c.profile !== 'filtered'
            || (row.status === c.filters.status && row.customer.id === c.filters.customerId));
        });
    } else if (endpoint === 'create-order') {
      method = 'POST';
      path = '/orders';
      const partition = f.writes.partitions[vu - 1];
      const products = partition.products.slice(0, c.items);
      payload = { customerId: partition.customerId, items: products.map((p) => ({ productId: p.id, quantity: c.quantity })) };
      const prices = Object.fromEntries(products.map((p) => [p.id, p.price]));
      validate = (b) => contract.createdOrder(b, payload, prices);
    } else {
      method = 'PATCH';
      const p = f.writes.partitions[vu - 1].patch;
      path = `/products/${p.id}/stock`;
      payload = { stock: 100 + (__ITER % 2) };
      validate = (b) => contract.product(b) && b.id === p.id && b.stock === payload.stock;
    }
    const tags = writes ? { vu_id: String(vu) } : {};
    attempts.add(1, tags);
    const r = http.request(method, c.baseUrl + path, payload ? JSON.stringify(payload) : null, {
      headers: payload ? { 'Content-Type': 'application/json' } : {},
      tags: { name: routes[endpoint] }, redirects: 0, timeout: '30s',
    });
    let body = null;
    try { body = r.json(); } catch { /* Recorded by the body check below. */ }
    let valid = false;
    try { valid = Boolean(validate(body)); } catch { /* Unexpected shapes fail the check. */ }
    const ok = check(r, {
      'expected HTTP status': (response) => response.status === (method === 'POST' ? 201 : 200),
      'response contract': () => valid,
    });
    successes.add(ok ? 1 : 0, tags);
    if (mode === 'smoke' && !writes) sleep(1);
  }

  function setup() {
    if (writes) {
      const scenarios = Object.values(exec.test.options.scenarios);
      const vus = scenarios.reduce((n, s) => n + (s.vus || s.maxVUs || 0), 0);
      if (vus < 1 || vus > f.writes.maxVus) exec.test.abort('VUs exceed prepared write partitions');
    }
  }

  function handleSummary(data) {
    const metadata = {
      implementation: __ENV.IMPLEMENTATION || null,
      endpoint, mode, baseUrl: c.baseUrl, profile: c.profile, fixtureHash: f.hash,
      fixturePreparedAt: f.preparedAt, dataset: f.dataset, seed: c.seed,
      runId: __ENV.RUN_ID || null, completedAt: new Date().toISOString(),
      items: c.items, quantity: c.quantity, budget: c.budget,
      options: exec.test.options,
    };
    const report = { metadata, ...data };
    // The runner reserves an exclusive directory before allowing file export.
    if (__ENV.RESULT_FILE) return { [__ENV.RESULT_FILE]: JSON.stringify(report, null, 2), stdout: JSON.stringify({ metadata, metrics: data.metrics }, null, 2) + '\n' };
    return { stdout: JSON.stringify(report, null, 2) + '\n' };
  }
  return { options, run, setup, handleSummary };
}
