import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { config } from './src/config/index.js';
import { seedAdmin } from './src/models/Admin.js';
import logger from './src/utils/logger.js';

const app = createApp();

// Catch unhandled errors at process level
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception — shutting down:', err);
  process.exit(1);
});

async function start() {
  await connectDb();
  await seedAdmin();

  if (!config.mail.host) {
    logger.warn('SMTP not configured — email features disabled');
  }

  if (!process.env.PLATFORM_URL) {
    logger.warn('PLATFORM_URL not set — email links will use default (bemore-tawny.vercel.app)');
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  // Track in-flight connections for graceful drain
  let connections = new Set();
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — starting graceful shutdown...`);

    // Phase 1: Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed — no new connections');

      // Phase 2: Disconnect MongoDB cleanly
      try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
      } catch (err) {
        logger.error('MongoDB disconnect error:', err.message);
      }

      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Phase 3: Give in-flight requests time to finish (15s)
    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown — destroying remaining connections');
      for (const conn of connections) {
        conn.destroy();
      }
      process.exit(1);
    }, 15000);
    forceExit.unref(); // Don't keep process alive just for the timer
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
