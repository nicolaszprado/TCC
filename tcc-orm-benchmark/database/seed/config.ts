export const RANDOM_SEED = 12_345;

export const DATE_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2025-12-31T23:59:59.000Z',
} as const;

export const DATASET_CONFIG = {
  small: { categories: 100, products: 10_000, customers: 2_000, orders: 5_000, minItemsPerOrder: 1, maxItemsPerOrder: 8 },
  medium: { categories: 100, products: 100_000, customers: 20_000, orders: 50_000, minItemsPerOrder: 1, maxItemsPerOrder: 8 },
  large: { categories: 100, products: 1_000_000, customers: 200_000, orders: 500_000, minItemsPerOrder: 1, maxItemsPerOrder: 8 },
} as const;

export type DatasetName = keyof typeof DATASET_CONFIG;
export type DatasetConfig = (typeof DATASET_CONFIG)[DatasetName];
