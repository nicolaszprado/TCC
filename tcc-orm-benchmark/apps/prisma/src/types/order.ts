import type { Pagination } from './pagination.js';

type DecimalValue = { toString(): string };

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderModel = {
  id: bigint;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: bigint;
    name: string;
    email: string;
  };
  items: Array<{
    id: bigint;
    quantity: number;
    unitPrice: DecimalValue;
    product: {
      id: bigint;
      name: string;
    };
  }>;
};

export type OrderResponse = {
  id: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: string;
    product: {
      id: number;
      name: string;
    };
  }>;
};

export type OrderFilters = Pagination & {
  status: OrderStatus | null;
  customerId: string | null;
};

export type OrderListResult = {
  orders: OrderModel[];
  total: number;
};

export type CreateOrderInput = {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type CreateOrderResult =
  | { kind: 'created'; order: OrderModel }
  | { kind: 'customer_not_found' }
  | { kind: 'product_not_available' }
  | { kind: 'insufficient_stock' };
