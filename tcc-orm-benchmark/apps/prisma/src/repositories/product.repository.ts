import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  ProductDetailsModel,
  ProductFilters,
  ProductListResult,
  ProductModel,
} from '../types/product.js';
import { paginationOffset } from '../validators/common.validator.js';

const PRODUCT_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

export async function findProductById(id: string): Promise<ProductModel | null> {
  return prisma.product.findUnique({
    where: { id: BigInt(id) },
    select: PRODUCT_SELECT,
  });
}

export async function findProducts(filters: ProductFilters): Promise<ProductListResult> {
  const where: Prisma.ProductWhereInput = {
    categoryId: filters.categoryId === null ? undefined : BigInt(filters.categoryId),
    price: filters.minPrice === null && filters.maxPrice === null
      ? undefined
      : {
          gte: filters.minPrice ?? undefined,
          lte: filters.maxPrice ?? undefined,
        },
    active: filters.active ?? undefined,
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy: { id: 'asc' },
      take: filters.limit,
      skip: paginationOffset(filters),
    }),
  ]);

  return { products, total };
}

export async function findProductDetailsById(id: string): Promise<ProductDetailsModel | null> {
  return prisma.product.findUnique({
    where: { id: BigInt(id) },
    select: {
      ...PRODUCT_SELECT,
      details: {
        select: {
          weightKg: true,
          widthCm: true,
          heightCm: true,
          depthCm: true,
          manufacturer: true,
          warrantyMonths: true,
        },
      },
    },
  });
}

export async function updateProductStock(id: string, stock: number): Promise<ProductModel | null> {
  try {
    return await prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        stock,
        updatedAt: new Date(),
      },
      select: PRODUCT_SELECT,
    });
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}
