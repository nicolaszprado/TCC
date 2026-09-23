import { CsvWriter } from '../csv.js';
import { randomForId, isoDate } from '../random.js';

const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export async function generateOrders(path: string, count: number, customerCount: number): Promise<void> {
  const writer = await CsvWriter.create(path, ['id', 'customer_id', 'status', 'created_at', 'updated_at']);
  for (let id = 1; id <= count; id += 1) {
    const random = randomForId(id, 0x1004);
    const createdAt = isoDate(random);
    await writer.write([id, random.int(1, customerCount), random.pick(ORDER_STATUSES), createdAt, isoDate(random)]);
  }
  await writer.close();
}
