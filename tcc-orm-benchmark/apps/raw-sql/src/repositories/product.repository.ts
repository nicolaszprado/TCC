import { pool } from '../config/database.js';
import { paginationOffset } from '../validators/common.validator.js';
import type {
  ProductDetailsRow,
  ProductFilters,
  ProductListResult,
  ProductRow,
} from '../types/product.js';

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

export async function findProducts(filters: ProductFilters): Promise<ProductListResult> {
  const values = [
    filters.categoryId,
    filters.minPrice,
    filters.maxPrice,
    filters.active,
  ];
  const where = `WHERE ($1::BIGINT IS NULL OR category_id = $1)
       AND ($2::NUMERIC IS NULL OR price >= $2)
       AND ($3::NUMERIC IS NULL OR price <= $3)
       AND ($4::BOOLEAN IS NULL OR active = $4)`;

  const [countResult, productsResult] = await Promise.all([
    pool.query<{ total: string }>(`SELECT COUNT(*) AS total FROM products ${where}`, values),
    pool.query<ProductRow>(
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
       ${where}
       ORDER BY id ASC
       LIMIT $5 OFFSET $6`,
      [...values, filters.limit, paginationOffset(filters)],
    ),
  ]);

  return {
    rows: productsResult.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export async function findProductDetailsById(id: string): Promise<ProductDetailsRow | null> {
  const result = await pool.query<ProductDetailsRow>(
    `SELECT
       p.id,
       p.category_id,
       p.name,
       p.description,
       p.price,
       p.stock,
       p.active,
       p.created_at,
       p.updated_at,
       pd.product_id AS detail_product_id,
       pd.weight_kg,
       pd.width_cm,
       pd.height_cm,
       pd.depth_cm,
       pd.manufacturer,
       pd.warranty_months
     FROM products p
     LEFT JOIN product_details pd ON pd.product_id = p.id
     WHERE p.id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function updateProductStock(id: string, stock: number): Promise<ProductRow | null> {
  const result = await pool.query<ProductRow>(
    `UPDATE products
     SET stock = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING
       id,
       category_id,
       name,
       description,
       price,
       stock,
       active,
       created_at,
       updated_at`,
    [id, stock],
  );

  return result.rows[0] ?? null;
}
