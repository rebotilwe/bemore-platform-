import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

export default function requestLogger(req, res, next) {
  // Generate or accept request ID for tracing
  const requestId = req.headers['x-request-id'] || `req_${randomUUID().slice(0, 12)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger.log({
      level,
      message: `${req.method} ${req.originalUrl} - ${res.statusCode} (${ms}ms)`,
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: ms,
      ip: req.ip,
    });
  });
  next();
}
