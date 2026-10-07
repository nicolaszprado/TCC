import type {
  ProductDetailsModel,
  ProductDetailsResponse,
  ProductModel,
  ProductResponse,
} from '../types/product.js';

export function toProductResponse(product: ProductModel): ProductResponse {
  return {
    id: Number(product.id),
    categoryId: Number(product.categoryId),
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    stock: product.stock,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductDetailsResponse(product: ProductDetailsModel): ProductDetailsResponse {
  return {
    ...toProductResponse(product),
    details: product.details === null
      ? null
      : {
          weightKg: product.details.weightKg?.toString() ?? null,
          widthCm: product.details.widthCm?.toString() ?? null,
          heightCm: product.details.heightCm?.toString() ?? null,
          depthCm: product.details.depthCm?.toString() ?? null,
          manufacturer: product.details.manufacturer,
          warrantyMonths: product.details.warrantyMonths,
        },
  };
}
