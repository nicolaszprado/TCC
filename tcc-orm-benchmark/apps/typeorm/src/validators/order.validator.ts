import type { CreateOrderInput, OrderFilters, OrderStatus } from '../types/order.js';
import { ORDER_STATUSES } from '../types/order.js';
import {
  parseJsonId,
  parsePagination,
  parsePositiveBigInt,
  singleQueryValue,
} from './common.validator.js';

export function parseOrderId(value: string): string | null {
  return parsePositiveBigInt(value);
}

export function parseOrderFilters(query: Record<string, unknown>): OrderFilters | null {
  const pagination = parsePagination(query.page, query.limit, 20);
  if (!pagination) return null;

  const rawStatus = singleQueryValue(query.status);
  let status: OrderStatus | null = null;
  if (rawStatus !== undefined) {
    if (rawStatus === null || !ORDER_STATUSES.includes(rawStatus as OrderStatus)) return null;
    status = rawStatus as OrderStatus;
  }

  const rawCustomerId = singleQueryValue(query.customerId);
  const customerId = rawCustomerId === undefined
    ? null
    : rawCustomerId === null
      ? null
      : parsePositiveBigInt(rawCustomerId);
  if (rawCustomerId !== undefined && customerId === null) return null;
  return { ...pagination, status, customerId };
}

export function parseCreateOrder(body: unknown): CreateOrderInput | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const customerId = parseJsonId(record.customerId);
  if (!customerId || !Array.isArray(record.items) || record.items.length < 1 || record.items.length > 100) {
    return null;
  }

  const items: CreateOrderInput['items'] = [];
  const productIds = new Set<string>();
  for (const rawItem of record.items) {
    if (typeof rawItem !== 'object' || rawItem === null || Array.isArray(rawItem)) return null;
    const item = rawItem as Record<string, unknown>;
    const productId = parseJsonId(item.productId);
    const quantity = item.quantity;
    if (
      !productId
      || !Number.isInteger(quantity)
      || (quantity as number) < 1
      || (quantity as number) > 2_147_483_647
      || productIds.has(productId)
    ) {
      return null;
    }

    productIds.add(productId);
    items.push({ productId, quantity: quantity as number });
  }
  return { customerId, items };
}
