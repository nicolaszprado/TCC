import { findProductById } from '../repositories/product.repository.js';
import type { ProductRow } from '../types/product.js';

export function getProductById(id: string): Promise<ProductRow | null> {
  return findProductById(id);
}
