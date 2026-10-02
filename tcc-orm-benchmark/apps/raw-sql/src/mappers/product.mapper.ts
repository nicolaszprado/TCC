import type { ProductResponse, ProductRow } from '../types/product.js';

export function toProductResponse(product: ProductRow): ProductResponse {
  return {
    id: Number(product.id),
    categoryId: Number(product.category_id),
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    active: product.active,
    createdAt: product.created_at.toISOString(),
    updatedAt: product.updated_at.toISOString(),
  };
}
