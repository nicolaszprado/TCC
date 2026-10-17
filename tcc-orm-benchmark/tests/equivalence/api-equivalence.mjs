import assert from 'node:assert/strict';

const implementations = [
  { name: 'Raw SQL', baseUrl: process.env.RAW_SQL_URL ?? 'http://127.0.0.1:3001' },
  { name: 'TypeORM', baseUrl: process.env.TYPEORM_URL ?? 'http://127.0.0.1:3002' },
  { name: 'Prisma', baseUrl: process.env.PRISMA_URL ?? 'http://127.0.0.1:3003' },
];

const cases = [
  { name: 'existing product', method: 'GET', path: '/products/100' },
  { name: 'missing product', method: 'GET', path: '/products/999999999999' },
  { name: 'invalid product id', method: 'GET', path: '/products/abc' },
  { name: 'product page', method: 'GET', path: '/products?page=1&limit=5' },
  { name: 'product details', method: 'GET', path: '/products/100/details' },
  { name: 'order page', method: 'GET', path: '/orders?page=1&limit=5' },
  { name: 'existing order', method: 'GET', path: '/orders/1' },
  { name: 'customer orders', method: 'GET', path: '/customers/1/orders?page=1&limit=5' },
  { name: 'invalid order id', method: 'GET', path: '/orders/abc' },
  { name: 'invalid customer id', method: 'GET', path: '/customers/abc/orders' },
  {
    name: 'invalid stock payload',
    method: 'PATCH',
    path: '/products/1/stock',
    body: { stock: -1 },
  },
  {
    name: 'invalid order payload',
    method: 'POST',
    path: '/orders',
    body: { customerId: 1, items: [] },
  },
  {
    name: 'missing customer',
    method: 'POST',
    path: '/orders',
    body: { customerId: 999999999999, items: [{ productId: 1, quantity: 1 }] },
  },
  {
    name: 'missing product',
    method: 'POST',
    path: '/orders',
    body: { customerId: 1, items: [{ productId: 999999999999, quantity: 1 }] },
  },
  {
    name: 'insufficient stock',
    method: 'POST',
    path: '/orders',
    body: { customerId: 1, items: [{ productId: 1, quantity: 2_147_483_647 }] },
  },
];

async function request(implementation, testCase) {
  const response = await fetch(`${implementation.baseUrl}${testCase.path}`, {
    method: testCase.method,
    headers: testCase.body ? { 'content-type': 'application/json' } : undefined,
    body: testCase.body ? JSON.stringify(testCase.body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

let failures = 0;
for (const testCase of cases) {
  try {
    const results = await Promise.all(
      implementations.map((implementation) => request(implementation, testCase)),
    );
    for (let index = 1; index < results.length; index += 1) {
      assert.deepStrictEqual(results[index], results[0]);
    }
    console.log(`PASS ${testCase.method} ${testCase.path} (${testCase.name})`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${testCase.method} ${testCase.path} (${testCase.name})`);
    console.error(error);
  }
}

if (failures > 0) process.exitCode = 1;
