const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Validate required env vars in production
if (isProd) {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`FATAL: Missing required env vars in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const productionOrigins = [
  'https://bemore-tawny.vercel.app',
  'https://bemorecapital.co.za',
];

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const defaultCorsOrigins = isProd ? productionOrigins : [...devOrigins, ...productionOrigins];

export const config = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProd,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bemore',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  cors: {
    origin: (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.trim() === '*')
      ? defaultCorsOrigins
      : process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@bemore.co.za',
    fromName: process.env.SMTP_FROM_NAME || 'BeMore Group',
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
  admin: {
    email: process.env.ADMIN_SEED_EMAIL || '',
    password: process.env.ADMIN_SEED_PASSWORD || '',
  },
});
