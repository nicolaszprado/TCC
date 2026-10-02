import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toOrderResponse, toOrderResponses } from '../src/mappers/order.mapper.js';
import { toProductDetailsResponse } from '../src/mappers/product.mapper.js';
import type { OrderJoinedRow } from '../src/types/order.js';
import type { ProductDetailsRow } from '../src/types/product.js';

const createdAt = new Date('2025-03-10T14:00:00.000Z');
const updatedAt = new Date('2025-03-10T14:05:00.000Z');

function orderRow(orderId: string, itemId: string): OrderJoinedRow {
  return {
    order_id: orderId,
    status: 'PAID',
    order_created_at: createdAt,
    order_updated_at: updatedAt,
    customer_id: '20',
    customer_name: 'Ada Lovelace',
    customer_email: 'ada@example.com',
    item_id: itemId,
    quantity: 2,
    unit_price: '149.90',
    product_id: '100',
    product_name: 'Wireless Mouse',
  };
}

describe('order mapper', () => {
  it('groups joined rows as nested items', () => {
    const response = toOrderResponse([orderRow('501', '900'), orderRow('501', '901')]);
    assert.equal(response.id, 501);
    assert.equal(response.customer.id, 20);
    assert.deepEqual(response.items.map((item) => item.id), [900, 901]);
    assert.equal(response.items[0]?.unitPrice, '149.90');
  });

  it('groups a list without duplicating orders', () => {
    const response = toOrderResponses([
      orderRow('502', '902'),
      orderRow('501', '900'),
      orderRow('501', '901'),
    ]);
    assert.deepEqual(response.map((order) => order.id), [502, 501]);
    assert.equal(response[1]?.items.length, 2);
  });
});

describe('product details mapper', () => {
  const product: ProductDetailsRow = {
    id: '100',
    category_id: '8',
    name: 'Wireless Mouse',
    description: null,
    price: '149.90',
    stock: 35,
    active: true,
    created_at: createdAt,
    updated_at: updatedAt,
    detail_product_id: '100',
    weight_kg: '0.120',
    width_cm: '6.20',
    height_cm: '3.90',
    depth_cm: '10.50',
    manufacturer: 'Example',
    warranty_months: 12,
  };

  it('maps one-to-one details and preserves decimal strings', () => {
    const response = toProductDetailsResponse(product);
    assert.equal(response.details?.weightKg, '0.120');
    assert.equal(response.price, '149.90');
  });

  it('maps a missing optional relation to null', () => {
    const response = toProductDetailsResponse({ ...product, detail_product_id: null });
    assert.equal(response.details, null);
  });
});

