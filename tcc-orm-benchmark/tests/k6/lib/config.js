export const endpoints = [
  'get-product-by-id', 'list-products', 'get-product-details', 'get-customer-orders',
  'get-order-by-id', 'list-orders', 'create-order', 'update-product-stock',
];
export const isWrite = (endpoint) => ['create-order', 'update-product-stock'].includes(endpoint);

export const implementations = {
  'raw-sql': 'http://localhost:3001',
  typeorm: 'http://localhost:3002',
  prisma: 'http://localhost:3003',
};

export function benchmarkTarget(env, requestedImplementation) {
  const implementation = requestedImplementation || env.IMPLEMENTATION || 'raw-sql';
  if (!Object.prototype.hasOwnProperty.call(implementations, implementation)) throw new Error('Invalid IMPLEMENTATION');
  return {
    implementation,
    baseUrl: env.BASE_URL || implementations[implementation],
  };
}

export function integer(value, fallback, name, max = Number.MAX_SAFE_INTEGER) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`${name}: expected integer 1..${max}`);
  return n;
}

export function pickIndex(length, seed, vu, iteration) {
  let h = (seed ^ Math.imul(vu, 0x9e3779b1) ^ Math.imul(iteration + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) % length;
}

export function configuration(endpoint, env, f) {
  if (!endpoints.includes(endpoint)) throw new Error('Unknown endpoint');
  if (!/^https?:\/\/[^\s/?#]+(?:\/[^?#\s]*)?$/.test(env.BASE_URL || '')) throw new Error('BASE_URL is required (http/https)');
  if (f.version !== 1 || !f.hash || !f.products?.length || !f.orders?.length) throw new Error('Prepare benchmark fixtures first');
  const profile = env.PROFILE || (env.ITEMS_PER_ORDER === '3' ? 'three-items' : 'baseline');
  const profiles = endpoint.startsWith('list-') ? ['baseline', 'filtered', 'paginated']
    : endpoint === 'create-order' ? ['baseline', 'three-items'] : ['baseline'];
  if (!profiles.includes(profile)) throw new Error(`Invalid PROFILE for ${endpoint}`);
  const c = {
    endpoint, baseUrl: env.BASE_URL.replace(/\/$/, ''), profile,
    seed: integer(env.SEED, 12345, 'SEED'), limit: integer(env.LIMIT, 20, 'LIMIT', 100),
    page: integer(env.PAGE, 1, 'PAGE'), quantity: integer(env.QUANTITY, 1, 'QUANTITY', 2147483647),
    items: integer(env.ITEMS_PER_ORDER, profile === 'three-items' ? 3 : 1, 'ITEMS_PER_ORDER', 3),
  };
  c.products = f.products;
  if (endpoint === 'get-product-details') c.products = f.detailProducts || f.products.filter((p) => p.hasDetails);
  if (!env.PRODUCT_ID && (env.MIN_PRODUCT_ID !== undefined || env.MAX_PRODUCT_ID !== undefined)) {
    const min = integer(env.MIN_PRODUCT_ID, 1, 'MIN_PRODUCT_ID');
    const max = integer(env.MAX_PRODUCT_ID, f.products[f.products.length - 1].id, 'MAX_PRODUCT_ID');
    const range = c.products.filter((p) => p.id >= min && p.id <= max);
    if (max < min || range.length !== max - min + 1) throw new Error('Product interval is not continuous in fixtures');
    c.products = range;
  }
  if (env.PRODUCT_ID !== undefined && !isWrite(endpoint)) {
    const fixed = integer(env.PRODUCT_ID, undefined, 'PRODUCT_ID');
    c.products = c.products.filter((p) => p.id === fixed);
  }
  if (!c.products.length) throw new Error('No eligible products');
  c.orders = f.orders;
  if (env.ORDER_ID !== undefined) c.orders = c.orders.filter((o) => o.id === integer(env.ORDER_ID, undefined, 'ORDER_ID'));
  if (!c.orders.length) throw new Error('No eligible orders');
  const customerCounts = {};
  for (const o of f.orders) customerCounts[o.customerId] = (customerCounts[o.customerId] || 0) + 1;
  c.customers = f.customers.filter((id) => customerCounts[id]).map((id) => ({ id, total: customerCounts[id] }));
  if (env.CUSTOMER_ID !== undefined) c.customers = c.customers.filter((x) => x.id === integer(env.CUSTOMER_ID, undefined, 'CUSTOMER_ID'));
  if (!c.customers.length) throw new Error('No customer with orders in fixtures');
  c.total = endpoint === 'list-products' ? f.products.length : f.orders.length;
  c.filters = {};
  if (profile === 'filtered' && endpoint === 'list-products') {
    c.filters = { categoryId: integer(env.CATEGORY_ID, f.filters.categoryId, 'CATEGORY_ID'),
      minPrice: env.MIN_PRICE ?? '10.00', maxPrice: env.MAX_PRICE ?? '5000.00', active: env.ACTIVE ?? 'true' };
    for (const key of ['minPrice', 'maxPrice']) {
      if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(c.filters[key])) throw new Error(`Invalid ${key}`);
    }
    if (!['true', 'false'].includes(c.filters.active) || Number(c.filters.minPrice) > Number(c.filters.maxPrice)) throw new Error('Invalid product filters');
    c.total = f.products.filter((p) => p.categoryId === c.filters.categoryId && String(p.active) === c.filters.active
      && Number(p.price) >= Number(c.filters.minPrice) && Number(p.price) <= Number(c.filters.maxPrice)).length;
  }
  if (profile === 'filtered' && endpoint === 'list-orders') {
    c.filters = { status: env.STATUS || 'PENDING', customerId: integer(env.CUSTOMER_ID, f.filters.customerId, 'CUSTOMER_ID') };
    if (!['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(c.filters.status)) throw new Error('Invalid STATUS');
    c.total = f.orders.filter((o) => o.customerId === c.filters.customerId && o.status === c.filters.status).length;
  }
  if (endpoint.startsWith('list-') && (c.total === 0 || (c.page - 1) * c.limit >= c.total)) throw new Error('Requested list page is empty in fixtures');
  if (endpoint === 'get-customer-orders' && c.customers.some((x) => (c.page - 1) * c.limit >= x.total)) throw new Error('Customer page is empty');
  if (isWrite(endpoint)) {
    if (env.ALLOW_WRITES !== 'true' || !f.writes) throw new Error('Writes require ALLOW_WRITES=true and prepared write fixtures');
    if (env.PRODUCT_ID || env.CUSTOMER_ID) throw new Error('Writes use exclusive fixture partitions, not fixed IDs');
    c.budget = integer(env.MAX_ORDERS_PER_VU, undefined, 'MAX_ORDERS_PER_VU');
    if (c.budget > f.writes.budget || c.quantity > f.writes.quantity) throw new Error('Write budget exceeds prepared stock');
    if (c.items !== (profile === 'three-items' ? 3 : 1)) throw new Error('ITEMS_PER_ORDER must match PROFILE');
  }
  return c;
}
