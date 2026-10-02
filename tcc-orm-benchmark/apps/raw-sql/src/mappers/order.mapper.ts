import type { OrderJoinedRow, OrderResponse } from '../types/order.js';

export function toOrderResponse(rows: OrderJoinedRow[]): OrderResponse {
  const order = rows[0];
  if (!order) throw new Error('Cannot map an order without rows.');

  const items: OrderResponse['items'] = [];
  for (const row of rows) {
    if (
      row.item_id === null
      || row.quantity === null
      || row.unit_price === null
      || row.product_id === null
      || row.product_name === null
    ) {
      continue;
    }

    items.push({
      id: Number(row.item_id),
      quantity: row.quantity,
      unitPrice: row.unit_price,
      product: {
        id: Number(row.product_id),
        name: row.product_name,
      },
    });
  }

  return {
    id: Number(order.order_id),
    status: order.status,
    createdAt: order.order_created_at.toISOString(),
    updatedAt: order.order_updated_at.toISOString(),
    customer: {
      id: Number(order.customer_id),
      name: order.customer_name,
      email: order.customer_email,
    },
    items,
  };
}

export function toOrderResponses(rows: OrderJoinedRow[]): OrderResponse[] {
  const groupedRows = new Map<string, OrderJoinedRow[]>();
  for (const row of rows) {
    const group = groupedRows.get(row.order_id);
    if (group) group.push(row);
    else groupedRows.set(row.order_id, [row]);
  }
  return [...groupedRows.values()].map(toOrderResponse);
}

