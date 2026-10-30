import type { NextFunction, Request, Response } from 'express';

import { toOrderResponse } from '../../mappers/order.mapper.js';
import { parseOrderFilters } from '../../validators/order.validator.js';
import { findOrdersWithNPlusOne } from './n-plus-one.repository.js';

/** Deliberately inefficient endpoint, available only for the N+1 SQL audit. */
export async function listOrdersNPlusOneController(
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
    const result = await findOrdersWithNPlusOne(filters);
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
