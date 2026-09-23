import { faker } from '@faker-js/faker';
import { CsvWriter } from '../csv.js';
import { randomForId } from '../random.js';

export async function generateProductDetails(path: string, productCount: number): Promise<void> {
  faker.seed(12_349);
  const writer = await CsvWriter.create(path, ['product_id', 'weight_kg', 'width_cm', 'height_cm', 'depth_cm', 'manufacturer', 'warranty_months']);
  for (let productId = 1; productId <= productCount; productId += 1) {
    const random = randomForId(productId, 0x1002);
    await writer.write([productId, random.decimal(0.05, 80, 3), random.decimal(1, 200, 2), random.decimal(1, 200, 2), random.decimal(1, 200, 2), `${faker.company.name()} #${random.int(1, 1_000)}`, random.pick([0, 6, 12, 24, 36, 48, 60])]);
  }
  await writer.close();
}
