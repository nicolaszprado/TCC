import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toOrderResponse } from '../src/mappers/order.mapper.js';
import { toProductDetailsResponse } from '../src/mappers/product.mapper.js';
import type { OrderModel } from '../src/types/order.js';
import type { ProductDetailsModel } from '../src/types/product.js';

const createdAt = new Date('2025-03-10T14:00:00.000Z');
const updatedAt = new Date('2025-03-10T14:05:00.000Z');

describe('order mapper', () => {
  const order: OrderModel = {
    id: 501n,
    status: 'PAID',
    createdAt,
    updatedAt,
    customer: {
      id: 20n,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
    items: [
      {
        id: 900n,
        quantity: 2,
        unitPrice: { toString: () => '149.90' },
        product: { id: 100n, name: 'Wireless Mouse' },
      },
    ],
  };

  it('maps nested relations and preserves decimal strings', () => {
    const response = toOrderResponse(order);
    assert.equal(response.id, 501);
    assert.equal(response.customer.id, 20);
    assert.equal(response.items[0]?.id, 900);
    assert.equal(response.items[0]?.unitPrice, '149.90');
  });
});

describe('product details mapper', () => {
  const product: ProductDetailsModel = {
    id: 100n,
    categoryId: 8n,
    name: 'Wireless Mouse',
    description: null,
    price: { toString: () => '149.90' },
    stock: 35,
    active: true,
    createdAt,
    updatedAt,
    details: {
      weightKg: { toString: () => '0.120' },
      widthCm: { toString: () => '6.20' },
      heightCm: { toString: () => '3.90' },
      depthCm: { toString: () => '10.50' },
      manufacturer: 'Example',
      warrantyMonths: 12,
    },
  };

  it('maps one-to-one details and preserves decimal strings', () => {
    const response = toProductDetailsResponse(product);
    assert.equal(response.details?.weightKg, '0.120');
    assert.equal(response.price, '149.90');
  });

  it('maps a missing optional relation to null', () => {
    const response = toProductDetailsResponse({ ...product, details: null });
    assert.equal(response.details, null);
  });
});
