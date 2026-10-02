import { Router } from 'express';

import { getProductController } from '../controllers/product.controller.js';

export const productRouter = Router();

productRouter.get('/:id', getProductController);
