import type { OrderModel, OrderResponse, OrderStatus } from '../types/order.js';

export function toOrderResponse(order: OrderModel): OrderResponse {
  return {
    id: Number(order.id),
    status: order.status as OrderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      id: Number(order.customer.id),
      name: order.customer.name,
      email: order.customer.email,
    },
    items: order.items.map((item) => ({
      id: Number(item.id),
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      product: {
        id: Number(item.product.id),
        name: item.product.name,
      },
    })),
  };
}
