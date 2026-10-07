import {
  Between,
  type FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

import { dataSource } from '../config/database.js';
import { Product } from '../entities/product.entity.js';
import type {
  ProductDetailsModel,
  ProductFilters,
  ProductListResult,
  ProductModel,
} from '../types/product.js';
import { paginationOffset } from '../validators/common.validator.js';

function productWhere(filters: ProductFilters): FindOptionsWhere<Product> {
  let price: FindOptionsWhere<Product>['price'];
  if (filters.minPrice !== null && filters.maxPrice !== null) {
    price = Between(filters.minPrice, filters.maxPrice);
  } else if (filters.minPrice !== null) {
    price = MoreThanOrEqual(filters.minPrice);
  } else if (filters.maxPrice !== null) {
    price = LessThanOrEqual(filters.maxPrice);
  }

  return {
    categoryId: filters.categoryId ?? undefined,
    price,
    active: filters.active ?? undefined,
  };
}

export function findProductById(id: string): Promise<ProductModel | null> {
  return dataSource.getRepository(Product).findOneBy({ id });
}

export async function findProducts(filters: ProductFilters): Promise<ProductListResult> {
  const repository = dataSource.getRepository(Product);
  const where = productWhere(filters);
  const [total, products] = await Promise.all([
    repository.count({ where }),
    repository.find({
      where,
      order: { id: 'ASC' },
      take: filters.limit,
      skip: paginationOffset(filters),
    }),
  ]);

  return { products, total };
}

export function findProductDetailsById(id: string): Promise<ProductDetailsModel | null> {
  return dataSource
    .getRepository(Product)
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.details', 'details')
    .where('product.id = :id', { id })
    .getOne();
}

type ProductReturningRow = {
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

function returnedProduct(row: ProductReturningRow): ProductModel {
  return Object.assign(new Product(), {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function updateProductStock(id: string, stock: number): Promise<ProductModel | null> {
  const result = await dataSource
    .getRepository(Product)
    .createQueryBuilder()
    .update(Product)
    .set({
      stock,
      updatedAt: () => 'CURRENT_TIMESTAMP',
    })
    .where('id = :id', { id })
    .returning('*')
    .execute();

  const row = result.raw[0] as ProductReturningRow | undefined;
  return row ? returnedProduct(row) : null;
}
