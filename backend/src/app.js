import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());
  app.use(cors({ origin: config.cors.origin }));
  app.use(helmet());

  app.use('/api', rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
  }));

  app.use('/api', routes);

  app.use(errorHandler);

  return app;
}
