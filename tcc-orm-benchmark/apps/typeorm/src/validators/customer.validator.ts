import type { CustomerOrdersQuery } from '../types/customer.js';
import { parsePagination, parsePositiveBigInt } from './common.validator.js';

export function parseCustomerId(value: string): string | null {
  return parsePositiveBigInt(value);
}

export function parseCustomerOrdersQuery(
  query: Record<string, unknown>,
): CustomerOrdersQuery | null {
  return parsePagination(query.page, query.limit, 50);
}
