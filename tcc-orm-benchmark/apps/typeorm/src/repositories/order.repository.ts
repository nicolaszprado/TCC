import type { EntityManager, SelectQueryBuilder } from 'typeorm';

import { dataSource } from '../config/database.js';
import { Customer } from '../entities/customer.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { Order } from '../entities/order.entity.js';
import { Product } from '../entities/product.entity.js';
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderFilters,
  OrderListResult,
  OrderModel,
} from '../types/order.js';
import { paginationOffset } from '../validators/common.validator.js';

function orderRelationsQuery(manager: EntityManager): SelectQueryBuilder<Order> {
  return manager
    .getRepository(Order)
    .createQueryBuilder('ord')
    .innerJoinAndSelect('ord.customer', 'customer')
    .leftJoinAndSelect('ord.items', 'item')
    .leftJoinAndSelect('item.product', 'product')
    .select([
      'ord.id',
      'ord.status',
      'ord.createdAt',
      'ord.updatedAt',
      'customer.id',
      'customer.name',
      'customer.email',
      'item.id',
      'item.quantity',
      'item.unitPrice',
      'product.id',
      'product.name',
    ]);
}

function applyOrderFilters(
  query: SelectQueryBuilder<Order>,
  alias: string,
  filters: OrderFilters,
): SelectQueryBuilder<Order> {
  if (filters.status !== null) {
    query.andWhere(`${alias}.status = :status`, { status: filters.status });
  }
  if (filters.customerId !== null) {
    query.andWhere(`${alias}.customerId = :customerId`, { customerId: filters.customerId });
  }
  return query;
}

function findOrderByIdWithManager(manager: EntityManager, id: string): Promise<OrderModel | null> {
  return orderRelationsQuery(manager)
    .where('ord.id = :id', { id })
    .orderBy('item.id', 'ASC', 'NULLS LAST')
    .getOne();
}

export function findOrderById(id: string): Promise<OrderModel | null> {
  return findOrderByIdWithManager(dataSource.manager, id);
}

export async function findOrders(filters: OrderFilters): Promise<OrderListResult> {
  const countQuery = applyOrderFilters(
    dataSource.getRepository(Order).createQueryBuilder('count_order'),
    'count_order',
    filters,
  );

  const pageQuery = applyOrderFilters(
    dataSource
      .getRepository(Order)
      .createQueryBuilder('page_order')
      .select('page_order.id', 'id'),
    'page_order',
    filters,
  )
    .orderBy('page_order.createdAt', 'DESC')
    .addOrderBy('page_order.id', 'DESC')
    .limit(filters.limit)
    .offset(paginationOffset(filters));

  const ordersQuery = orderRelationsQuery(dataSource.manager)
    .innerJoin(`(${pageQuery.getQuery()})`, 'page', 'page.id = ord.id')
    .setParameters(pageQuery.getParameters())
    .orderBy('ord.createdAt', 'DESC')
    .addOrderBy('ord.id', 'DESC')
    .addOrderBy('item.id', 'ASC', 'NULLS LAST');

  const [total, orders] = await Promise.all([
    countQuery.getCount(),
    ordersQuery.getMany(),
  ]);

  return { orders, total };
}

type TransactionAbortKind = Exclude<CreateOrderResult['kind'], 'created'>;

class TransactionAbort extends Error {
  constructor(readonly kind: TransactionAbortKind) {
    super(kind);
  }
}

function sortItemsByProductId(input: CreateOrderInput): CreateOrderInput['items'] {
  return [...input.items].sort((left, right) => {
    const leftId = BigInt(left.productId);
    const rightId = BigInt(right.productId);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

async function createOrderTransaction(
  manager: EntityManager,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const customerExists = await manager.getRepository(Customer).existsBy({ id: input.customerId });
  if (!customerExists) throw new TransactionAbort('customer_not_found');

  const sortedItems = sortItemsByProductId(input);
  const products = await manager
    .getRepository(Product)
    .createQueryBuilder('product')
    .select(['product.id', 'product.price', 'product.stock', 'product.active'])
    .where('product.id IN (:...productIds)', {
      productIds: sortedItems.map((item) => item.productId),
    })
    .orderBy('product.id', 'ASC')
    .setLock('pessimistic_write')
    .getMany();

  if (products.length !== input.items.length || products.some((product) => !product.active)) {
    throw new TransactionAbort('product_not_available');
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  if (input.items.some((item) => {
    const product = productById.get(item.productId);
    return !product || product.stock < item.quantity;
  })) {
    throw new TransactionAbort('insufficient_stock');
  }

  const orderInsert = await manager
    .createQueryBuilder()
    .insert()
    .into(Order)
    .values({ customerId: input.customerId, status: 'PENDING' })
    .returning('id')
    .execute();
  const orderId = (orderInsert.raw[0] as { id?: string } | undefined)?.id;
  if (!orderId) throw new Error('Order insert did not return an id.');

  await manager
    .createQueryBuilder()
    .insert()
    .into(OrderItem)
    .values(input.items.map((item) => ({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: productById.get(item.productId)!.price,
    })))
    .execute();

  const updateParameters: Record<string, string | number | string[]> = {
    productIds: sortedItems.map((item) => item.productId),
  };
  const stockCases = sortedItems.map((item, index) => {
    updateParameters[`productId${index}`] = item.productId;
    updateParameters[`quantity${index}`] = item.quantity;
    return `WHEN CAST(:productId${index} AS BIGINT) THEN CAST(:quantity${index} AS INTEGER)`;
  }).join(' ');

  await manager
    .createQueryBuilder()
    .update(Product)
    .set({
      stock: () => `"stock" - CASE "id" ${stockCases} END`,
      updatedAt: () => 'CURRENT_TIMESTAMP',
    })
    .where('id IN (:...productIds)')
    .setParameters(updateParameters)
    .execute();

  const order = await findOrderByIdWithManager(manager, orderId);
  if (!order) throw new Error('Created order could not be loaded.');
  return { kind: 'created', order };
}

export async function insertOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    return await dataSource.transaction(
      (manager) => createOrderTransaction(manager, input),
    );
  } catch (error) {
    if (error instanceof TransactionAbort) return { kind: error.kind };
    throw error;
  }
}
