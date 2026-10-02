import type { Pagination } from '../types/pagination.js';

const MAX_BIGINT = 9_223_372_036_854_775_807n;

export function parsePositiveBigInt(value: string): string | null {
  if (!/^\d+$/.test(value)) return null;

  try {
    const id = BigInt(value);
    if (id <= 0n || id > MAX_BIGINT) return null;

    return id.toString();
  } catch {
    return null;
  }
}

export function parseJsonId(value: unknown): string | null {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) return null;
  return parsePositiveBigInt(String(value));
}

export function singleQueryValue(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) return null;
  return value;
}

function parsePositiveSafeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePagination(
  pageValue: unknown,
  limitValue: unknown,
  defaultLimit: number,
): Pagination | null {
  const rawPage = singleQueryValue(pageValue);
  const rawLimit = singleQueryValue(limitValue);
  if (rawPage === null || rawLimit === null) return null;

  const page = rawPage === undefined ? 1 : parsePositiveSafeInteger(rawPage);
  const limit = rawLimit === undefined ? defaultLimit : parsePositiveSafeInteger(rawLimit);
  if (page === null || limit === null || limit > 100) return null;

  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) return null;

  return { page, limit };
}

export function paginationOffset(pagination: Pagination): number {
  return (pagination.page - 1) * pagination.limit;
}
