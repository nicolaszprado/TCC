import {
  findProductById,
  findProductDetailsById,
  findProducts,
  updateProductStock as updateProductStockRepository,
} from '../repositories/product.repository.js';
import type {
  ProductDetailsRow,
  ProductFilters,
  ProductListResult,
  ProductRow,
} from '../types/product.js';

export function getProductById(id: string): Promise<ProductRow | null> {
  return findProductById(id);
}

export function listProducts(filters: ProductFilters): Promise<ProductListResult> {
  return findProducts(filters);
}

export function getProductDetailsById(id: string): Promise<ProductDetailsRow | null> {
  return findProductDetailsById(id);
}

export function updateProductStock(id: string, stock: number): Promise<ProductRow | null> {
  return updateProductStockRepository(id, stock);
}
