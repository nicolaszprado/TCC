import { prisma } from '../config/database.js';
import {
  runWithTransactionRetry,
  TRANSACTION_ISOLATION_PRISMA,
} from '../../../shared/transaction-policy.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderFilters,
  type OrderListResult,
  type OrderModel,
} from '../types/order.js';
import { paginationOffset } from '../validators/common.validator.js';

const ORDER_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.OrderSelect;

export function findOrderById(id: string): Promise<OrderModel | null> {
  return prisma.order.findUnique({
    where: { id: BigInt(id) },
    select: ORDER_SELECT,
  });
}

export async function findOrders(filters: OrderFilters): Promise<OrderListResult> {
  const where: Prisma.OrderWhereInput = {
    status: filters.status ?? undefined,
    customerId: filters.customerId === null ? undefined : BigInt(filters.customerId),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: ORDER_SELECT,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: filters.limit,
      skip: paginationOffset(filters),
    }),
  ]);

  return { orders, total };
}

type TransactionAbortKind = 'insufficient_stock';

class TransactionAbort extends Error {
  constructor(readonly kind: TransactionAbortKind) {
    super(kind);
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

export async function insertOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    return await runWithTransactionRetry(
      () => prisma.$transaction(async (transaction) => {
        const customer = await transaction.customer.findUnique({
          where: { id: BigInt(input.customerId) },
          select: { id: true },
        });
        if (!customer) return { kind: 'customer_not_found' } as const;

        const sortedItems = [...input.items].sort((left, right) => {
          const leftId = BigInt(left.productId);
          const rightId = BigInt(right.productId);
          return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
        });
        const products = await transaction.product.findMany({
          where: {
            id: { in: sortedItems.map((item) => BigInt(item.productId)) },
          },
          select: {
            id: true,
            price: true,
            stock: true,
            active: true,
          },
          orderBy: { id: 'asc' },
        });

        if (products.length !== input.items.length || products.some((product) => !product.active)) {
          return { kind: 'product_not_available' } as const;
        }

        const productById = new Map(products.map((product) => [product.id.toString(), product]));
        if (input.items.some((item) => {
          const product = productById.get(item.productId);
          return !product || product.stock < item.quantity;
        })) {
          return { kind: 'insufficient_stock' } as const;
        }

        const order = await transaction.order.create({
          data: {
            customerId: BigInt(input.customerId),
            status: 'PENDING',
            items: {
              create: input.items.map((item) => ({
                productId: BigInt(item.productId),
                quantity: item.quantity,
                unitPrice: productById.get(item.productId)!.price,
              })),
            },
          },
          select: ORDER_SELECT,
        });

        const updatedAt = new Date();
        for (const item of sortedItems) {
          const result = await transaction.product.updateMany({
            where: {
              id: BigInt(item.productId),
              active: true,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
              updatedAt,
            },
          });
          if (result.count !== 1) throw new TransactionAbort('insufficient_stock');
        }

        return { kind: 'created', order } as const;
      }, {
        isolationLevel: TRANSACTION_ISOLATION_PRISMA,
      }),
      (error) => hasErrorCode(error, 'P2034'),
    );
  } catch (error) {
    if (error instanceof TransactionAbort) return { kind: error.kind };
    throw error;
  }
}
