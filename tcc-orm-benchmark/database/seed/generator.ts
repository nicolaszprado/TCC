import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATASET_CONFIG, DATE_RANGE, RANDOM_SEED, type DatasetName } from './config.js';
import { generateCategories } from './generators/categories.generator.js';
import { generateCustomers } from './generators/customers.generator.js';
import { generateOrderItems } from './generators/order-items.generator.js';
import { generateOrders } from './generators/orders.generator.js';
import { generateProductDetails } from './generators/product-details.generator.js';
import { generateProducts } from './generators/products.generator.js';

const projectRoot = process.cwd();
const outputDirectory = join(projectRoot, 'database', 'seed', 'output');
const metadataPath = join(projectRoot, 'database', 'metadata', 'dataset.json');

function parseDatasetName(argument: string | undefined): DatasetName {
  if (argument && argument in DATASET_CONFIG) return argument as DatasetName;
  throw new Error(`Choose one dataset scale: ${Object.keys(DATASET_CONFIG).join(', ')}.`);
}

async function main(): Promise<void> {
  const dataset = parseDatasetName(process.argv[2]);
  const config = DATASET_CONFIG[dataset];
  await mkdir(outputDirectory, { recursive: true });

  // Files are written to temporary names so a failed run never leaves partial CSVs.
  const temporary = (name: string) => join(outputDirectory, `.${name}.tmp`);
  const final = (name: string) => join(outputDirectory, name);
  console.log(`Generating ${dataset} dataset (seed ${RANDOM_SEED})...`);

  await generateCategories(temporary('categories.csv'), config.categories);
  await generateProducts(temporary('products.csv'), config.products, config.categories);
  await generateProductDetails(temporary('product_details.csv'), config.products);
  await generateCustomers(temporary('customers.csv'), config.customers);
  await generateOrders(temporary('orders.csv'), config.orders, config.customers);
  const orderItems = await generateOrderItems(temporary('order_items.csv'), config.orders, config.products, config.minItemsPerOrder, config.maxItemsPerOrder);

  const filenames = ['categories.csv', 'products.csv', 'product_details.csv', 'customers.csv', 'orders.csv', 'order_items.csv'];
  await Promise.all(filenames.map(async (filename) => rename(temporary(filename), final(filename))));

  await mkdir(join(projectRoot, 'metadata'), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify({
    dataset,
    seed: RANDOM_SEED,
    categories: config.categories,
    products: config.products,
    productDetails: config.products,
    customers: config.customers,
    orders: config.orders,
    orderItems,
    dateRange: { from: DATE_RANGE.from.slice(0, 10), to: DATE_RANGE.to.slice(0, 10) },
  }, null, 2)}\n`);
  console.log(`Done. CSV files: ${outputDirectory}`);
  console.log(`Metadata: ${metadataPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
