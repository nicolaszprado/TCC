import type {
  CustomerResponse,
  CustomerRow,
  OrderSummaryResponse,
  OrderSummaryRow,
} from '../types/customer.js';

export function toCustomerResponse(customer: CustomerRow): CustomerResponse {
  return {
    id: Number(customer.id),
    name: customer.name,
    email: customer.email,
    createdAt: customer.created_at.toISOString(),
  };
}

export function toOrderSummaryResponse(order: OrderSummaryRow): OrderSummaryResponse {
  return {
    id: Number(order.id),
    customerId: Number(order.customer_id),
    status: order.status,
    createdAt: order.created_at.toISOString(),
    updatedAt: order.updated_at.toISOString(),
  };
}

