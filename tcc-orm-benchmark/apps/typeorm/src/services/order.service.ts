import {
  findOrderById,
  findOrders,
  insertOrder,
} from '../repositories/order.repository.js';
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderFilters,
  OrderListResult,
  OrderModel,
} from '../types/order.js';

export function getOrderById(id: string): Promise<OrderModel | null> {
  return findOrderById(id);
}

export function listOrders(filters: OrderFilters): Promise<OrderListResult> {
  return findOrders(filters);
}

export function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  return insertOrder(input);
}
