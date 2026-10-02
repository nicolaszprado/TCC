import { Router } from 'express';

import {
  createOrderController,
  getOrderController,
  listOrdersController,
} from '../controllers/order.controller.js';

export const orderRouter = Router();

orderRouter.get('/', listOrdersController);
orderRouter.post('/', createOrderController);
orderRouter.get('/:id', getOrderController);

