import 'dotenv/config';

import { app } from './app.js';
import { dataSource } from './config/database.js';

const port = Number(process.env.PORT ?? 3003);

await dataSource.initialize();

const server = app.listen(port, () => {
  console.log(`TypeORM API listening on port ${port}`);
});

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
