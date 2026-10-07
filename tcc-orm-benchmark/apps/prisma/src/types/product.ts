type DecimalValue = { toString(): string };

export type ProductModel = {
  id: bigint;
  categoryId: bigint;
  name: string;
  description: string | null;
  price: DecimalValue;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export type ProductDetailsModel = ProductModel & {
  details: {
    weightKg: DecimalValue | null;
    widthCm: DecimalValue | null;
    heightCm: DecimalValue | null;
    depthCm: DecimalValue | null;
    manufacturer: string | null;
    warrantyMonths: number | null;
  } | null;
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
