import type {
  ProductDetailsResponse,
  ProductDetailsRow,
  ProductResponse,
  ProductRow,
} from '../types/product.js';

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

export function toProductDetailsResponse(product: ProductDetailsRow): ProductDetailsResponse {
  return {
    ...toProductResponse(product),
    details: product.detail_product_id === null
      ? null
      : {
          weightKg: product.weight_kg,
          widthCm: product.width_cm,
          heightCm: product.height_cm,
          depthCm: product.depth_cm,
          manufacturer: product.manufacturer,
          warrantyMonths: product.warranty_months,
        },
  };
}
