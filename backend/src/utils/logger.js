import winston from 'winston';
import { config } from '../config/index.js';
import redactPII from './redactPII.js';

const isProd = config.nodeEnv === 'production';

// Custom format to redact PII before logging (POPIA compliance)
const redactFormat = winston.format((info) => {
  // Redact message
  if (typeof info.message === 'string') {
    info.message = redactPII(info.message);
  }

  // Redact meta fields (excluding symbols and internal fields)
  const skipKeys = ['level', 'message', 'timestamp', 'service', 'requestId', 'duration', 'stack'];
  for (const [key, value] of Object.entries(info)) {
    if (skipKeys.includes(key) || key.startsWith('_')) continue;

    if (typeof value === 'string') {
      info[key] = redactPII(value);
    } else if (typeof value === 'object' && value !== null) {
      info[key] = redactPII(value);
    }
  }

  return info;
});

// Production: structured JSON (parseable by log aggregators)
// Development: colorized human-readable
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat(),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  redactFormat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, duration, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (requestId) log += ` [${requestId}]`;
    if (duration) log += ` (${duration}ms)`;
    // Strip noisy fields
    delete meta.req;
    delete meta.service;
    const keys = Object.keys(meta);
    if (keys.length > 0) log += ` ${JSON.stringify(meta)}`;
    return log;
  }),
);

const transports = [
  new winston.transports.Console(),
];

// Production: add file transport with rotation-friendly naming
if (isProd) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB per file
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB per file
      maxFiles: 10,
      tailable: true,
    }),
  );
}

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  defaultMeta: { service: 'bemore-api' },
  transports,
});

export default logger;
