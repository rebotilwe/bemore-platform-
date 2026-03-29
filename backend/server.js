import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { config } from './src/config/index.js';
import { seedAdmin } from './src/models/Admin.js';
import logger from './src/utils/logger.js';

const app = createApp();

async function start() {
  if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-me') {
    logger.error('FATAL: JWT_SECRET must be set in production. Exiting.');
    process.exit(1);
  }

  await connectDb();
  await seedAdmin();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down...`);
    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);

    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(forceExit);
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
