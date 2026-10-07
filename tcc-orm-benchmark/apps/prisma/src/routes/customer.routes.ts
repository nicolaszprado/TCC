import { Router } from 'express';

import { getCustomerOrdersController } from '../controllers/customer.controller.js';

export const customerRouter = Router();

customerRouter.get('/:id/orders', getCustomerOrdersController);
