import { test } from 'node:test';
import assert from 'node:assert/strict';
import { benchmarkTarget, configuration, pickIndex } from '../lib/config.js';
import { product, details, order, customerOrders, createdOrder, pagination } from '../lib/contracts.js';

const f = {
  version: 1, hash: 'fixture', products: [
    { id: 1, categoryId: 1, price: '10.00', active: true, hasDetails: true },
    { id: 3, categoryId: 2, price: '20.00', active: false, hasDetails: false },
  ], customers: [1, 2], orders: [{ id: 1, customerId: 1, status: 'PENDING', itemCount: 1 }],
  filters: { categoryId: 1, customerId: 1 }, writes: { maxVus: 1, budget: 100, quantity: 1 },
};
const env = { BASE_URL: 'http://localhost:3001' };
const p = { id: 1, categoryId: 1, name: 'Test', price: '10.00', stock: 10, active: true,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
const o = { id: 1, status: 'PENDING', createdAt: p.createdAt, updatedAt: p.updatedAt,
  customer: { id: 1, name: 'Customer', email: 'test@example.test' },
  items: [{ id: 1, quantity: 1, unitPrice: '10.00', product: { id: 1, name: 'Test' } }] };

test('selects the implementation default URL and honors an explicit URL', () => {
  assert.deepEqual(benchmarkTarget({}, undefined), { implementation: 'raw-sql', baseUrl: 'http://localhost:3001' });
  assert.deepEqual(benchmarkTarget({}, 'typeorm'), { implementation: 'typeorm', baseUrl: 'http://localhost:3002' });
  assert.deepEqual(benchmarkTarget({}, 'prisma'), { implementation: 'prisma', baseUrl: 'http://localhost:3003' });
  assert.deepEqual(benchmarkTarget({ IMPLEMENTATION: 'prisma', BASE_URL: 'http://127.0.0.1:3103' }), {
    implementation: 'prisma', baseUrl: 'http://127.0.0.1:3103',
  });
  assert.throws(() => benchmarkTarget({}, 'unknown'), /IMPLEMENTATION/);
});

test('deterministic selection stays in range and covers multiple IDs', () => {
  const a = Array.from({ length: 50 }, (_, i) => pickIndex(10, 12345, 1, i));
  assert.deepEqual(a, Array.from({ length: 50 }, (_, i) => pickIndex(10, 12345, 1, i)));
  assert(a.every((n) => n >= 0 && n < 10)); assert(new Set(a).size > 5);
  assert.notDeepEqual(a, Array.from({ length: 50 }, (_, i) => pickIndex(10, 12345, 2, i)));
});
test('rejects missing URL, absent fixed IDs and holes in ID intervals', () => {
  assert.throws(() => configuration('get-product-by-id', {}, f), /BASE_URL/);
  assert.throws(() => configuration('get-product-by-id', { ...env, PRODUCT_ID: '2' }, f), /eligible products/);
  assert.throws(() => configuration('get-product-by-id', { ...env, MIN_PRODUCT_ID: '1', MAX_PRODUCT_ID: '3' }, f), /continuous/);
  assert.equal(configuration('get-product-by-id', { ...env, PRODUCT_ID: '1', MAX_PRODUCT_ID: '99999' }, f).products[0].id, 1);
});
test('details and customers select only fixtures with relationships', () => {
  assert.deepEqual(configuration('get-product-details', env, f).products.map((p) => p.id), [1]);
  assert.deepEqual(configuration('get-customer-orders', env, f).customers, [{ id: 1, total: 1 }]);
});
test('filtered profiles compute exact counts; empty profiles fail before HTTP', () => {
  assert.equal(configuration('list-products', { ...env, PROFILE: 'filtered' }, f).total, 1);
  assert.equal(configuration('list-orders', { ...env, PROFILE: 'filtered' }, f).total, 1);
  assert.throws(() => configuration('list-products', { ...env, PROFILE: 'filtered', CATEGORY_ID: '50' }, f), /empty/);
  assert.throws(() => configuration('list-products', { ...env, PROFILE: 'filtered', MIN_PRICE: '20', MAX_PRICE: '10' }, f), /filters/);
  assert.throws(() => configuration('list-orders', { ...env, LIMIT: '101' }, f), /LIMIT/);
});
test('write authorization, budget, quantity, profiles and partitions are enforced', () => {
  assert.throws(() => configuration('create-order', env, f), /ALLOW_WRITES/);
  const write = { ...env, ALLOW_WRITES: 'true', MAX_ORDERS_PER_VU: '100' };
  assert.equal(configuration('create-order', { ...write, PROFILE: 'three-items' }, f).items, 3);
  assert.throws(() => configuration('create-order', { ...write, MAX_ORDERS_PER_VU: '101' }, f), /stock/);
  assert.throws(() => configuration('create-order', { ...write, QUANTITY: '2' }, f), /stock/);
  assert.throws(() => configuration('create-order', { ...write, ITEMS_PER_ORDER: '2' }, f), /PROFILE/);
  assert.throws(() => configuration('update-product-stock', { ...write, PRODUCT_ID: '1' }, f), /partitions/);
});
test('product/details contracts reject corrupt data and tolerate nullable detail fields', () => {
  assert(product(p)); assert(!product({ ...p, price: 10 })); assert(!product({ ...p, stock: -1 }));
  assert(!details({ ...p, details: null }));
  assert(details({ ...p, details: { weightKg: '1.2', widthCm: null, heightCm: '2', depthCm: '3', manufacturer: null, warrantyMonths: 0 } }));
});
test('customer orders use orders, validate relationship and handle last page', () => {
  const b = { customer: { ...o.customer, createdAt: p.createdAt }, orders: [{ ...o, customerId: 1 }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
  assert(customerOrders(b, 1, 1, 20, 1));
  assert(!customerOrders({ ...b, orders: undefined, data: b.orders }, 1, 1, 20, 1));
  assert(!customerOrders(b, 2, 1, 20, 1));
  assert(pagination({ page: 2, limit: 20, total: 21, totalPages: 2 }, [p], 2, 20, 21));
});
test('create order validates payload, quantities and prices beyond HTTP 201', () => {
  const payload = { customerId: 1, items: [{ productId: 1, quantity: 1 }] };
  assert(order(o)); assert(createdOrder(o, payload, { 1: '10.0' }));
  assert(!createdOrder(o, { ...payload, customerId: 2 }, { 1: '10' }));
  assert(!createdOrder(o, { ...payload, items: [{ productId: 1, quantity: 2 }] }, { 1: '10' }));
  assert(!createdOrder(o, payload, { 1: '11' }));
  assert(!order({ ...o, items: [] }));
});
