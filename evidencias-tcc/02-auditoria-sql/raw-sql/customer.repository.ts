import { pool } from '../config/database.js';
import type {
  CustomerOrdersQuery,
  CustomerOrdersResult,
  CustomerRow,
  OrderSummaryRow,
} from '../types/customer.js';
import { paginationOffset } from '../validators/common.validator.js';

export async function findCustomerOrders(
  id: string,
  query: CustomerOrdersQuery,
): Promise<CustomerOrdersResult | null> {
  const customerResult = await pool.query<CustomerRow>(
    `SELECT id, name, email, created_at
     FROM customers
     WHERE id = $1`,
    [id],
  );
  const customer = customerResult.rows[0];
  if (!customer) return null;

  const [countResult, ordersResult] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE customer_id = $1`,
      [id],
    ),
    pool.query<OrderSummaryRow>(
      `SELECT id, customer_id, status, created_at, updated_at
       FROM orders
       WHERE customer_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [id, query.limit, paginationOffset(query)],
    ),
  ]);

  return {
    customer,
    orders: ordersResult.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

