import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify, type Stringifier } from 'csv-stringify';

export class CsvWriter {
  private readonly csv: Stringifier;
  private readonly completion: Promise<void>;

  private constructor(csv: Stringifier, completion: Promise<void>) {
    this.csv = csv;
    this.completion = completion;
  }

  static async create(path: string, columns: string[]): Promise<CsvWriter> {
    await mkdir(dirname(path), { recursive: true });
    const file = createWriteStream(path, { encoding: 'utf8' });
    const csv = stringify({ header: true, columns, quoted: true, record_delimiter: '\n' });
    const completion = new Promise<void>((resolve, reject) => {
      file.on('finish', resolve);
      file.on('error', reject);
      csv.on('error', reject);
    });
    csv.pipe(file);
    return new CsvWriter(csv, completion);
  }

  async write(record: readonly (string | number | boolean | null)[]): Promise<void> {
    if (!this.csv.write(record)) {
      await new Promise<void>((resolve) => this.csv.once('drain', resolve));
    }
  }

  async close(): Promise<void> {
    this.csv.end();
    await this.completion;
  }
}
