import type { ProductFilters } from '../types/product.js';
import {
  parsePagination,
  parsePositiveBigInt,
  singleQueryValue,
} from './common.validator.js';

export function parseProductId(value: string): string | null {
  return parsePositiveBigInt(value);
}

const PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const MAX_PRICE = 9_999_999_999.99;

function parsePrice(value: unknown): string | undefined | null {
  const rawValue = singleQueryValue(value);
  if (rawValue === undefined || rawValue === null) return rawValue;
  if (!PRICE_PATTERN.test(rawValue) || Number(rawValue) > MAX_PRICE) return null;
  return rawValue;
}

export function parseProductFilters(query: Record<string, unknown>): ProductFilters | null {
  const pagination = parsePagination(query.page, query.limit, 50);
  if (!pagination) return null;

  const rawCategoryId = singleQueryValue(query.categoryId);
  const categoryId = rawCategoryId === undefined
    ? null
    : rawCategoryId === null
      ? null
      : parsePositiveBigInt(rawCategoryId);
  if (rawCategoryId !== undefined && categoryId === null) return null;

  const parsedMinPrice = parsePrice(query.minPrice);
  const parsedMaxPrice = parsePrice(query.maxPrice);
  if (parsedMinPrice === null || parsedMaxPrice === null) return null;

  const minPrice = parsedMinPrice ?? null;
  const maxPrice = parsedMaxPrice ?? null;
  if (minPrice !== null && maxPrice !== null && Number(maxPrice) < Number(minPrice)) return null;

  const rawActive = singleQueryValue(query.active);
  let active: boolean | null = null;
  if (rawActive !== undefined) {
    if (rawActive === null || (rawActive !== 'true' && rawActive !== 'false')) return null;
    active = rawActive === 'true';
  }

  return { ...pagination, categoryId, minPrice, maxPrice, active };
}

export function parseStock(body: unknown): number | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const stock = (body as Record<string, unknown>).stock;
  if (!Number.isInteger(stock) || (stock as number) < 0 || (stock as number) > 2_147_483_647) {
    return null;
  }
  return stock as number;
}
