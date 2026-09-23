import { faker } from '@faker-js/faker';
import { CsvWriter } from '../csv.js';
import { randomForId, isoDate } from '../random.js';

export async function generateCustomers(path: string, count: number): Promise<void> {
  faker.seed(12_350);
  const writer = await CsvWriter.create(path, ['id', 'name', 'email', 'created_at']);
  for (let id = 1; id <= count; id += 1) {
    await writer.write([id, faker.person.fullName(), `customer${id}@example.test`, isoDate(randomForId(id, 0x1003))]);
  }
  await writer.close();
}
