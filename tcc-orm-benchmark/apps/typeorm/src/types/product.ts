import type { ProductDetail } from '../entities/product-detail.entity.js';
import type { Product } from '../entities/product.entity.js';

export type ProductModel = Product;

export type ProductResponse = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilters = {
  page: number;
  limit: number;
  categoryId: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  active: boolean | null;
};

export type ProductDetailsModel = Product & {
  details: ProductDetail | null;
};

export type ProductDetailsResponse = ProductResponse & {
  details: {
    weightKg: string | null;
    widthCm: string | null;
    heightCm: string | null;
    depthCm: string | null;
    manufacturer: string | null;
    warrantyMonths: number | null;
  } | null;
};

export type ProductListResult = {
  products: ProductModel[];
  total: number;
};
