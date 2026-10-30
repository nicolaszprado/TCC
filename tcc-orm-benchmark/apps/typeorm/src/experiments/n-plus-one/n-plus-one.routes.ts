import { Router } from 'express';

import { listOrdersNPlusOneController } from './n-plus-one.controller.js';

export const nPlusOneOrderRouter = Router();

nPlusOneOrderRouter.get('/n-plus-one', listOrdersNPlusOneController);
