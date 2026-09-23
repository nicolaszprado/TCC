import { faker } from '@faker-js/faker';
import { CsvWriter } from '../csv.js';
import { SeededRandom, isoDate } from '../random.js';

export async function generateCategories(path: string, count: number): Promise<void> {
  faker.seed(12_346);
  const writer = await CsvWriter.create(path, ['id', 'name', 'description', 'created_at']);
  const random = new SeededRandom(12_347);
  for (let id = 1; id <= count; id += 1) {
    await writer.write([id, `${faker.commerce.department()} ${id}`, faker.commerce.productDescription(), isoDate(random)]);
  }
  await writer.close();
}
