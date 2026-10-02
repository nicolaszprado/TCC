import type { Pool, PoolClient } from 'pg';

import { pool } from '../config/database.js';
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderFilters,
  OrderJoinedRow,
  OrderListResult,
} from '../types/order.js';
import { paginationOffset } from '../validators/common.validator.js';

const ORDER_RELATIONS_SELECT = `SELECT
  o.id AS order_id,
  o.status,
  o.created_at AS order_created_at,
  o.updated_at AS order_updated_at,
  c.id AS customer_id,
  c.name AS customer_name,
  c.email AS customer_email,
  oi.id AS item_id,
  oi.quantity,
  oi.unit_price,
  p.id AS product_id,
  p.name AS product_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id`;

async function queryOrderById(
  connection: Pool | PoolClient,
  id: string,
): Promise<OrderJoinedRow[]> {
  const result = await connection.query<OrderJoinedRow>(
    `${ORDER_RELATIONS_SELECT}
     WHERE o.id = $1
     ORDER BY oi.id ASC`,
    [id],
  );
  return result.rows;
}

export function findOrderById(id: string): Promise<OrderJoinedRow[]> {
  return queryOrderById(pool, id);
}

export async function findOrders(filters: OrderFilters): Promise<OrderListResult> {
  const filterValues = [filters.status, filters.customerId];
  const filterSql = `WHERE ($1::VARCHAR IS NULL OR o.status = $1)
       AND ($2::BIGINT IS NULL OR o.customer_id = $2)`;

  const [countResult, ordersResult] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM orders o
       ${filterSql}`,
      filterValues,
    ),
    pool.query<OrderJoinedRow>(
      `WITH paginated_orders AS (
         SELECT o.id, o.created_at
         FROM orders o
         ${filterSql}
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT $3 OFFSET $4
       )
       ${ORDER_RELATIONS_SELECT}
       JOIN paginated_orders po ON po.id = o.id
       ORDER BY o.created_at DESC, o.id DESC, oi.id ASC`,
      [...filterValues, filters.limit, paginationOffset(filters)],
    ),
  ]);

  return {
    rows: ordersResult.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

type LockedProductRow = {
  id: string;
  price: string;
  stock: number;
  active: boolean;
};

async function rollback<T extends CreateOrderResult>(
  client: PoolClient,
  result: T,
): Promise<T> {
  await client.query('ROLLBACK');
  return result;
}

export async function insertOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const customerResult = await client.query<{ exists: boolean }>(
      `SELECT TRUE AS exists
       FROM customers
       WHERE id = $1`,
      [input.customerId],
    );
    if (!customerResult.rows[0]) {
      return rollback(client, { kind: 'customer_not_found' });
    }

    const sortedProductIds = input.items
      .map((item) => item.productId)
      .sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0));
    const productsResult = await client.query<LockedProductRow>(
      `SELECT id, price, stock, active
       FROM products
       WHERE id = ANY($1::BIGINT[])
       ORDER BY id ASC
       FOR UPDATE`,
      [sortedProductIds],
    );

    if (productsResult.rows.length !== input.items.length || productsResult.rows.some((product) => !product.active)) {
      return rollback(client, { kind: 'product_not_available' });
    }

    const quantityByProduct = new Map(input.items.map((item) => [item.productId, item.quantity]));
    if (productsResult.rows.some((product) => product.stock < (quantityByProduct.get(product.id) ?? 0))) {
      return rollback(client, { kind: 'insufficient_stock' });
    }

    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders (customer_id, status)
       VALUES ($1, 'PENDING')
       RETURNING id`,
      [input.customerId],
    );
    const orderId = orderResult.rows[0]?.id;
    if (!orderId) throw new Error('Order insert did not return an id.');

    const productIds = input.items.map((item) => item.productId);
    const quantities = input.items.map((item) => item.quantity);
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       SELECT $1::BIGINT, input.product_id, input.quantity, p.price
       FROM UNNEST($2::BIGINT[], $3::INTEGER[]) WITH ORDINALITY
         AS input(product_id, quantity, position)
       JOIN products p ON p.id = input.product_id
       ORDER BY input.position`,
      [orderId, productIds, quantities],
    );

    await client.query(
      `UPDATE products p
       SET stock = p.stock - input.quantity,
           updated_at = CURRENT_TIMESTAMP
       FROM UNNEST($1::BIGINT[], $2::INTEGER[]) AS input(product_id, quantity)
       WHERE p.id = input.product_id`,
      [productIds, quantities],
    );

    const rows = await queryOrderById(client, orderId);
    await client.query('COMMIT');
    return { kind: 'created', rows };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

