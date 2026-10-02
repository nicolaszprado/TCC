import type { OrderStatus } from './order.js';
import type { Pagination } from './pagination.js';

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
};

export type CustomerResponse = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type OrderSummaryRow = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  created_at: Date;
  updated_at: Date;
};

export type OrderSummaryResponse = {
  id: number;
  customerId: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrdersResult = {
  customer: CustomerRow;
  orders: OrderSummaryRow[];
  total: number;
};

export type CustomerOrdersQuery = Pagination;

