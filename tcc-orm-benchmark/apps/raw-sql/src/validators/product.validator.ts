const MAX_BIGINT = 9_223_372_036_854_775_807n;

export function parseProductId(value: string): string | null {
  if (!/^\d+$/.test(value)) return null;

  try {
    const id = BigInt(value);
    if (id <= 0n || id > MAX_BIGINT) return null;

    return id.toString();
  } catch {
    return null;
  }
}
