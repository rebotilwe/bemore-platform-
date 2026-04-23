import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import logger from './utils/logger.js';

export function createApp() {
  const app = express();

  // Trust first proxy (Railway / load balancer) so req.ip is accurate for rate limiting
  app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(cors(config.cors));
  app.use(helmet());

  app.use('/api', routes);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not Found', path: req.originalUrl });
  });

  app.use(errorHandler);

  logger.info('Express app created');

  return app;
}
