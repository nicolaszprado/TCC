import { dataSource } from '../config/database.js';
import { Customer } from '../entities/customer.entity.js';
import { Order } from '../entities/order.entity.js';
import type {
  CustomerOrdersQuery,
  CustomerOrdersResult,
} from '../types/customer.js';
import { paginationOffset } from '../validators/common.validator.js';

export async function findCustomerOrders(
  id: string,
  query: CustomerOrdersQuery,
): Promise<CustomerOrdersResult | null> {
  const customer = await dataSource.getRepository(Customer).findOne({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
  if (!customer) return null;

  const repository = dataSource.getRepository(Order);
  const [total, orders] = await Promise.all([
    repository.count({ where: { customerId: id } }),
    repository.find({
      where: { customerId: id },
      select: {
        id: true,
        customerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      take: query.limit,
      skip: paginationOffset(query),
    }),
  ]);

  return { customer, orders, total };
}
