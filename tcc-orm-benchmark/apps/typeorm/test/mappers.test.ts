import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Customer } from '../src/entities/customer.entity.js';
import { OrderItem } from '../src/entities/order-item.entity.js';
import { Order } from '../src/entities/order.entity.js';
import { ProductDetail } from '../src/entities/product-detail.entity.js';
import { Product } from '../src/entities/product.entity.js';
import { toOrderResponse } from '../src/mappers/order.mapper.js';
import { toProductDetailsResponse } from '../src/mappers/product.mapper.js';

const createdAt = new Date('2025-03-10T14:00:00.000Z');
const updatedAt = new Date('2025-03-10T14:05:00.000Z');

describe('order mapper', () => {
  it('maps nested relations and preserves decimal strings', () => {
    const customer = Object.assign(new Customer(), {
      id: '20',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt,
    });
    const product = Object.assign(new Product(), { id: '100', name: 'Wireless Mouse' });
    const item = Object.assign(new OrderItem(), {
      id: '900',
      quantity: 2,
      unitPrice: '149.90',
      product,
    });
    const order = Object.assign(new Order(), {
      id: '501',
      status: 'PAID',
      createdAt,
      updatedAt,
      customer,
      items: [item],
    });

    const response = toOrderResponse(order);
    assert.equal(response.id, 501);
    assert.equal(response.customer.id, 20);
    assert.equal(response.items[0]?.id, 900);
    assert.equal(response.items[0]?.unitPrice, '149.90');
  });
});

describe('product details mapper', () => {
  const details = Object.assign(new ProductDetail(), {
    productId: '100',
    weightKg: '0.120',
    widthCm: '6.20',
    heightCm: '3.90',
    depthCm: '10.50',
    manufacturer: 'Example',
    warrantyMonths: 12,
  });
  const product = Object.assign(new Product(), {
    id: '100',
    categoryId: '8',
    name: 'Wireless Mouse',
    description: null,
    price: '149.90',
    stock: 35,
    active: true,
    createdAt,
    updatedAt,
    details,
  });

  it('maps one-to-one details and preserves decimal strings', () => {
    const response = toProductDetailsResponse(product);
    assert.equal(response.details?.weightKg, '0.120');
    assert.equal(response.price, '149.90');
  });

  it('maps a missing optional relation to null', () => {
    const response = toProductDetailsResponse(Object.assign(new Product(), product, { details: null }));
    assert.equal(response.details, null);
  });
});
