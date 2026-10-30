import { dataSource } from '../../config/database.js';
import { Customer } from '../../entities/customer.entity.js';
import { OrderItem } from '../../entities/order-item.entity.js';
import { Order } from '../../entities/order.entity.js';
import { Product } from '../../entities/product.entity.js';
import type { OrderFilters, OrderListResult } from '../../types/order.js';
import { paginationOffset } from '../../validators/common.validator.js';

/**
 * Intentionally inefficient query path, retained only for the N+1 audit.
 * It is excluded from the official API benchmark and code-metric scope.
 */
export async function findOrdersWithNPlusOne(filters: OrderFilters): Promise<OrderListResult> {
  const orderRepository = dataSource.getRepository(Order);
  const where = {
    ...(filters.status === null ? {} : { status: filters.status }),
    ...(filters.customerId === null ? {} : { customerId: filters.customerId }),
  };
  const [total, orders] = await Promise.all([
    orderRepository.count({ where }),
    orderRepository.find({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      take: filters.limit,
      skip: paginationOffset(filters),
    }),
  ]);

  const customerRepository = dataSource.getRepository(Customer);
  const itemRepository = dataSource.getRepository(OrderItem);
  const productRepository = dataSource.getRepository(Product);

  for (const order of orders) {
    const customer = await customerRepository.findOneByOrFail({ id: order.customerId });
    const items = await itemRepository.find({
      where: { orderId: order.id },
      order: { id: 'ASC' },
    });

    for (const item of items) {
      item.product = await productRepository.findOneByOrFail({ id: item.productId });
    }

    order.customer = customer;
    order.items = items;
  }

  return { orders, total };
}
