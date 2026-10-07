import type { NextFunction, Request, Response } from 'express';

import { toOrderResponse } from '../mappers/order.mapper.js';
import { createOrder, getOrderById, listOrders } from '../services/order.service.js';
import {
  parseCreateOrder,
  parseOrderFilters,
  parseOrderId,
} from '../validators/order.validator.js';

export async function getOrderController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = request.params.id;
  const id = typeof rawId === 'string' ? parseOrderId(rawId) : null;
  if (id === null) {
    response.status(400).json({ error: 'INVALID_ORDER_ID' });
    return;
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      response.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }
    response.status(200).json(toOrderResponse(order));
  } catch (error) {
    next(error);
  }
}

export async function listOrdersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const filters = parseOrderFilters(request.query);
  if (!filters) {
    response.status(400).json({ error: 'INVALID_ORDER_FILTERS' });
    return;
  }

  try {
    const result = await listOrders(filters);
    response.status(200).json({
      data: result.orders.map(toOrderResponse),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrderController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const input = parseCreateOrder(request.body);
  if (!input) {
    response.status(400).json({ error: 'INVALID_ORDER_PAYLOAD' });
    return;
  }

  try {
    const result = await createOrder(input);
    if (result.kind === 'customer_not_found') {
      response.status(404).json({ error: 'CUSTOMER_NOT_FOUND' });
      return;
    }
    if (result.kind === 'product_not_available') {
      response.status(409).json({ error: 'PRODUCT_NOT_AVAILABLE' });
      return;
    }
    if (result.kind === 'insufficient_stock') {
      response.status(409).json({ error: 'INSUFFICIENT_STOCK' });
      return;
    }

    response.status(201).json(toOrderResponse(result.order));
  } catch (error) {
    next(error);
  }
}
