import { findCustomerOrders } from '../repositories/customer.repository.js';
import type {
  CustomerOrdersQuery,
  CustomerOrdersResult,
} from '../types/customer.js';

export function getCustomerOrders(
  id: string,
  query: CustomerOrdersQuery,
): Promise<CustomerOrdersResult | null> {
  return findCustomerOrders(id, query);
}

