import { prisma } from '../config/database.js';
import type {
  CustomerOrdersQuery,
  CustomerOrdersResult,
} from '../types/customer.js';
import { paginationOffset } from '../validators/common.validator.js';

export async function findCustomerOrders(
  id: string,
  query: CustomerOrdersQuery,
): Promise<CustomerOrdersResult | null> {
  const customerId = BigInt(id);
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
  if (!customer) return null;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { customerId } }),
    prisma.order.findMany({
      where: { customerId },
      select: {
        id: true,
        customerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: query.limit,
      skip: paginationOffset(query),
    }),
  ]);

  return { customer, orders, total };
}
