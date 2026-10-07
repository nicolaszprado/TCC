import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { Category } from '../entities/category.entity.js';
import { Customer } from '../entities/customer.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { Order } from '../entities/order.entity.js';
import { ProductDetail } from '../entities/product-detail.entity.js';
import { Product } from '../entities/product.entity.js';

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  entities: [Category, Product, ProductDetail, Customer, Order, OrderItem],
  synchronize: false,
  logging: false,
  extra: {
    max: 10,
  },
});
