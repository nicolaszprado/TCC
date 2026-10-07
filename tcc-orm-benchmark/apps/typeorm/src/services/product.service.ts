import {
  findProductById,
  findProductDetailsById,
  findProducts,
  updateProductStock as updateProductStockRepository,
} from '../repositories/product.repository.js';
import type {
  ProductDetailsModel,
  ProductFilters,
  ProductListResult,
  ProductModel,
} from '../types/product.js';

export function getProductById(id: string): Promise<ProductModel | null> {
  return findProductById(id);
}

export function listProducts(filters: ProductFilters): Promise<ProductListResult> {
  return findProducts(filters);
}

export function getProductDetailsById(id: string): Promise<ProductDetailsModel | null> {
  return findProductDetailsById(id);
}

export function updateProductStock(id: string, stock: number): Promise<ProductModel | null> {
  return updateProductStockRepository(id, stock);
}
