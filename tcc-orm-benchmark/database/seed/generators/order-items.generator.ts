import { CsvWriter } from '../csv.js';
import { randomForId, productPrice } from '../random.js';

export async function generateOrderItems(path: string, orderCount: number, productCount: number, minItems: number, maxItems: number): Promise<number> {
  if (maxItems > productCount) throw new Error('maxItemsPerOrder cannot exceed the number of products.');
  const writer = await CsvWriter.create(path, ['id', 'order_id', 'product_id', 'quantity', 'unit_price']);
  let id = 1;
  for (let orderId = 1; orderId <= orderCount; orderId += 1) {
    const random = randomForId(orderId, 0x1005);
    const itemCount = random.int(minItems, maxItems);
    const products = new Set<number>();
    while (products.size < itemCount) products.add(random.int(1, productCount));
    for (const productId of products) {
      await writer.write([id, orderId, productId, random.int(1, 10), productPrice(productId)]);
      id += 1;
    }
  }
  await writer.close();
  return id - 1;
}
