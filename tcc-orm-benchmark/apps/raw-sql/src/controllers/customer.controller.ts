import type { NextFunction, Request, Response } from 'express';

import { toCustomerResponse, toOrderSummaryResponse } from '../mappers/customer.mapper.js';
import { getCustomerOrders } from '../services/customer.service.js';
import {
  parseCustomerId,
  parseCustomerOrdersQuery,
} from '../validators/customer.validator.js';

export async function getCustomerOrdersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = request.params.id;
  const id = typeof rawId === 'string' ? parseCustomerId(rawId) : null;
  if (id === null) {
    response.status(400).json({ error: 'INVALID_CUSTOMER_ID' });
    return;
  }

  const query = parseCustomerOrdersQuery(request.query);
  if (!query) {
    response.status(400).json({ error: 'INVALID_PAGINATION' });
    return;
  }

  try {
    const result = await getCustomerOrders(id, query);
    if (!result) {
      response.status(404).json({ error: 'CUSTOMER_NOT_FOUND' });
      return;
    }

    response.status(200).json({
      customer: toCustomerResponse(result.customer),
      orders: result.orders.map(toOrderSummaryResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

