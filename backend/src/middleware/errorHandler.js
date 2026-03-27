import { config } from '../config/index.js';

export default function errorHandler(err, _req, res, _next) {
  console.error(`[ERROR] ${err.message}`);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate entry' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Server error' : err.message,
  });
}
