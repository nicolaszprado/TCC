export type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

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

export type ProductDetailsRow = ProductRow & {
  detail_product_id: string | null;
  weight_kg: string | null;
  width_cm: string | null;
  height_cm: string | null;
  depth_cm: string | null;
  manufacturer: string | null;
  warranty_months: number | null;
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
  rows: ProductRow[];
  total: number;
};
