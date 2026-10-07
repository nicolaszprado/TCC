import express from 'express';

import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { customerRouter } from './routes/customer.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { productRouter } from './routes/product.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use('/products', productRouter);
app.use('/customers', customerRouter);
app.use('/orders', orderRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
