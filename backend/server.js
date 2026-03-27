import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { config } from './src/config/index.js';
import { seedAdmin } from './src/models/Admin.js';

const app = createApp();

async function start() {
  await connectDb();
  await seedAdmin();

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  // ── Graceful shutdown ──
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down...`);
    const forceExit = setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);

    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(forceExit);
      console.log('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
