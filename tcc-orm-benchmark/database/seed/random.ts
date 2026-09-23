import { DATE_RANGE, RANDOM_SEED } from './config.js';

/** A small deterministic PRNG, used where a value must be reproducible from its ID. */
export class SeededRandom {
  private state: number;

  constructor(seed = RANDOM_SEED) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  decimal(min: number, max: number, decimals: number): string {
    const factor = 10 ** decimals;
    return (Math.round((min + this.next() * (max - min)) * factor) / factor).toFixed(decimals);
  }

  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)]!;
  }
}

export function randomForId(id: number, salt: number): SeededRandom {
  return new SeededRandom((RANDOM_SEED ^ Math.imul(id, 0x9e3779b1) ^ salt) >>> 0);
}

export function isoDate(random: SeededRandom): string {
  const from = Date.parse(DATE_RANGE.from);
  const to = Date.parse(DATE_RANGE.to);
  return new Date(from + Math.floor(random.next() * (to - from + 1))).toISOString();
}

/** Must remain the same in products and order-items to preserve historical unit prices. */
export function productPrice(productId: number): string {
  return randomForId(productId, 0x51ed).decimal(10, 5_000, 2);
}
