import type {
  CustomerModel,
  CustomerResponse,
  OrderSummaryModel,
  OrderSummaryResponse,
} from '../types/customer.js';
import type { OrderStatus } from '../types/order.js';

export function toCustomerResponse(customer: CustomerModel): CustomerResponse {
  return {
    id: Number(customer.id),
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt.toISOString(),
  };
}

export function toOrderSummaryResponse(order: OrderSummaryModel): OrderSummaryResponse {
  return {
    id: Number(order.id),
    customerId: Number(order.customerId),
    status: order.status as OrderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
