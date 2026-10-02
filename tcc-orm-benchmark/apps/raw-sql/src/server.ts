import 'dotenv/config';

import { app } from './app.js';
import { pool } from './config/database.js';

const port = Number(process.env.PORT ?? 3001);

const server = app.listen(port, () => {
  console.log(`Raw SQL API listening on port ${port}`);
});

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(async () => {
    await pool.end();
  });
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
