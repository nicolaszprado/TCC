import type { NextFunction, Request, Response } from 'express';

import { toProductDetailsResponse, toProductResponse } from '../mappers/product.mapper.js';
import {
  getProductById,
  getProductDetailsById,
  listProducts,
  updateProductStock,
} from '../services/product.service.js';
import {
  parseProductFilters,
  parseProductId,
  parseStock,
} from '../validators/product.validator.js';

export async function listProductsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const filters = parseProductFilters(request.query);
  if (!filters) {
    response.status(400).json({ error: 'INVALID_PRODUCT_FILTERS' });
    return;
  }

  try {
    const result = await listProducts(filters);
    response.status(200).json({
      data: result.products.map(toProductResponse),
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

export async function getProductDetailsController(
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
    const product = await getProductDetailsById(id);
    if (!product) {
      response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
      return;
    }
    response.status(200).json(toProductDetailsResponse(product));
  } catch (error) {
    next(error);
  }
}

export async function updateProductStockController(
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

  const stock = parseStock(request.body);
  if (stock === null) {
    response.status(400).json({ error: 'INVALID_STOCK' });
    return;
  }

  try {
    const product = await updateProductStock(id, stock);
    if (!product) {
      response.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
      return;
    }
    response.status(200).json(toProductResponse(product));
  } catch (error) {
    next(error);
  }
}
