import type { Pagination } from './pagination.js';

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderJoinedRow = {
  order_id: string;
  status: OrderStatus;
  order_created_at: Date;
  order_updated_at: Date;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  item_id: string | null;
  quantity: number | null;
  unit_price: string | null;
  product_id: string | null;
  product_name: string | null;
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
  rows: OrderJoinedRow[];
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
  | { kind: 'created'; rows: OrderJoinedRow[] }
  | { kind: 'customer_not_found' }
  | { kind: 'product_not_available' }
  | { kind: 'insufficient_stock' };

