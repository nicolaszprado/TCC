import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCreateOrder, parseOrderFilters } from '../src/validators/order.validator.js';
import {
  parseProductFilters,
  parseProductId,
  parseStock,
} from '../src/validators/product.validator.js';

describe('product validators', () => {
  it('normalizes the product id and rejects invalid bigint values', () => {
    assert.equal(parseProductId('001'), '1');
    assert.equal(parseProductId('0'), null);
    assert.equal(parseProductId('-1'), null);
    assert.equal(parseProductId('9223372036854775808'), null);
  });

  it('applies product filter defaults', () => {
    assert.deepEqual(parseProductFilters({}), {
      page: 1,
      limit: 50,
      categoryId: null,
      minPrice: null,
      maxPrice: null,
      active: null,
    });
  });

  it('normalizes combined product filters', () => {
    assert.deepEqual(parseProductFilters({
      page: '2',
      limit: '25',
      categoryId: '03',
      minPrice: '10.00',
      maxPrice: '20.50',
      active: 'false',
    }), {
      page: 2,
      limit: 25,
      categoryId: '3',
      minPrice: '10.00',
      maxPrice: '20.50',
      active: false,
    });
  });

  it('rejects invalid filters and stock values', () => {
    assert.equal(parseProductFilters({ page: '0' }), null);
    assert.equal(parseProductFilters({ limit: '101' }), null);
    assert.equal(parseProductFilters({ minPrice: '20', maxPrice: '10' }), null);
    assert.equal(parseProductFilters({ active: 'yes' }), null);
    assert.equal(parseProductFilters({ categoryId: ['1', '2'] }), null);
    assert.equal(parseStock({ stock: -1 }), null);
    assert.equal(parseStock({ stock: 1.5 }), null);
    assert.equal(parseStock({ stock: '1' }), null);
    assert.equal(parseStock({ stock: 0 }), 0);
  });
});

describe('order validators', () => {
  it('applies order filter defaults and validates enum filters', () => {
    assert.deepEqual(parseOrderFilters({}), {
      page: 1,
      limit: 20,
      status: null,
      customerId: null,
    });
    assert.deepEqual(parseOrderFilters({ status: 'PAID', customerId: '02' }), {
      page: 1,
      limit: 20,
      status: 'PAID',
      customerId: '2',
    });
    assert.equal(parseOrderFilters({ status: 'UNKNOWN' }), null);
  });

  it('normalizes a valid order payload', () => {
    assert.deepEqual(parseCreateOrder({
      customerId: 20,
      items: [
        { productId: 100, quantity: 2 },
        { productId: 101, quantity: 1 },
      ],
    }), {
      customerId: '20',
      items: [
        { productId: '100', quantity: 2 },
        { productId: '101', quantity: 1 },
      ],
    });
  });

  it('rejects empty, duplicate and incorrectly typed order items', () => {
    assert.equal(parseCreateOrder({ customerId: 20, items: [] }), null);
    assert.equal(parseCreateOrder({
      customerId: 20,
      items: [
        { productId: 100, quantity: 1 },
        { productId: 100, quantity: 2 },
      ],
    }), null);
    assert.equal(parseCreateOrder({
      customerId: '20',
      items: [{ productId: 100, quantity: 1 }],
    }), null);
    assert.equal(parseCreateOrder({
      customerId: 20,
      items: [{ productId: 100, quantity: 0 }],
    }), null);
  });
});
