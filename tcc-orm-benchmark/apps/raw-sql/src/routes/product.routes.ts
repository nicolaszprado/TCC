import { Router } from 'express';

import {
  getProductController,
  getProductDetailsController,
  listProductsController,
  updateProductStockController,
} from '../controllers/product.controller.js';

export const productRouter = Router();

productRouter.get('/', listProductsController);
productRouter.get('/:id/details', getProductDetailsController);
productRouter.patch('/:id/stock', updateProductStockController);
productRouter.get('/:id', getProductController);
