import type { Customer } from '../entities/customer.entity.js';
import type { Order } from '../entities/order.entity.js';
import type { OrderStatus } from './order.js';
import type { Pagination } from './pagination.js';

export type CustomerModel = Customer;
export type OrderSummaryModel = Order;

export type CustomerResponse = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type OrderSummaryResponse = {
  id: number;
  customerId: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrdersResult = {
  customer: CustomerModel;
  orders: OrderSummaryModel[];
  total: number;
};

export type CustomerOrdersQuery = Pagination;
