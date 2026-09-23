import { faker } from '@faker-js/faker';
import { CsvWriter } from '../csv.js';
import { randomForId, isoDate, productPrice } from '../random.js';

export async function generateProducts(path: string, count: number, categoryCount: number): Promise<void> {
  faker.seed(12_348);
  const writer = await CsvWriter.create(path, ['id', 'category_id', 'name', 'description', 'price', 'stock', 'active', 'created_at', 'updated_at']);
  for (let id = 1; id <= count; id += 1) {
    const random = randomForId(id, 0x1001);
    const createdAt = isoDate(random);
    const updatedAt = isoDate(random);
    await writer.write([id, random.int(1, categoryCount), `${faker.commerce.productName()} #${id}`, faker.commerce.productDescription(), productPrice(id), random.int(0, 500), random.int(1, 100) <= 92, createdAt, updatedAt]);
  }
  await writer.close();
}
