import { pool } from '../config/database.js';
import type { ProductRow } from '../types/product.js';

export async function findProductById(id: string): Promise<ProductRow | null> {
  const result = await pool.query<ProductRow>(
    `SELECT
       id,
       category_id,
       name,
       description,
       price,
       stock,
       active,
       created_at,
       updated_at
     FROM products
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}
