import logger from '../utils/logger.js';

export default function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger.log({
      level,
      message: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${ms}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      req
    });
  });
  next();
}
