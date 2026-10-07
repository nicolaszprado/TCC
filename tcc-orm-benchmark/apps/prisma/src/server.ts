import 'dotenv/config';

import { app } from './app.js';
import { prisma } from './config/database.js';

const port = Number(process.env.PORT ?? 3002);

const server = app.listen(port, () => {
  console.log(`Prisma API listening on port ${port}`);
});

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(async () => {
    await prisma.$disconnect();
  });
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
