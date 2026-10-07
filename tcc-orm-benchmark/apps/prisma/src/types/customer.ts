import type { OrderStatus } from './order.js';
import type { Pagination } from './pagination.js';

export type CustomerModel = {
  id: bigint;
  name: string;
  email: string;
  createdAt: Date;
};

export type CustomerResponse = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type OrderSummaryModel = {
  id: bigint;
  customerId: bigint;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
