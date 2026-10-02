import type { NextFunction, Request, Response } from 'express';

import { toProductResponse } from '../mappers/product.mapper.js';
import { getProductById } from '../services/product.service.js';
import { parseProductId } from '../validators/product.validator.js';

export async function getProductController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = request.params.id;
  const id = typeof rawId === 'string' ? parseProductId(rawId) : null;
  if (id === null) {
    response.status(400).json({ error: 'INVALID_PRODUCT_ID' });
    return;
  }

  try {
    const product = await getProductById(id);
    if (!product) {
      response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
      return;
    }

    response.status(200).json(toProductResponse(product));
  } catch (error) {
    next(error);
  }
}
