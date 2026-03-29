import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, _next) {
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = err.errors
      ? Object.entries(err.errors).map(([field, e]) => ({ field, message: e.message }))
      : [];
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }

  // JSON parse error (malformed body)
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.message.includes('JSON'))) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  // MongoDB network/timeout errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({ success: false, message: 'Database temporarily unavailable' });
  }

  // JWT errors (in case they bubble up)
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired — please log in again' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Server error' : err.message,
    requestId: req.requestId,
  });
}
