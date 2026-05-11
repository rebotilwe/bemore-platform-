const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isStaging = nodeEnv === 'staging';

// Validate required env vars in production and staging.
// `RESEND_API_KEY` is required because Resend is the sole transactional email
// provider (SMTP fallback was removed 2026-05-11). Without it the app boots,
// returns 201 on submit, but every email — incl. POPIA receipts — silently
// fails. Fail loud at boot instead.
if (isProd || isStaging) {
  const required = ['JWT_SECRET', 'MONGODB_URI', 'RESEND_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`FATAL: Missing required env vars in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const productionOrigins = [
  'https://bemore-tawny.vercel.app',
  'https://bemorecapital.co.za',
  'https://www.bemorecapital.co.za',
];

const stagingOrigins = [
  'https://bemorecapital.co.za',
  'https://www.bemorecapital.co.za',
  'https://bemore-staging.up.railway.app',
];

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const defaultCorsOrigins = isProd
  ? productionOrigins
  : isStaging
    ? stagingOrigins
    : [...devOrigins, ...productionOrigins, ...stagingOrigins];

export const config = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProd,
  isStaging,
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
    // Resend is the sole email provider (SMTP was removed 2026-05-11).
    // `EMAIL_FROM` / `EMAIL_FROM_NAME` are the canonical envs; legacy
    // `SMTP_FROM` / `SMTP_FROM_NAME` still read as a fallback so existing
    // deployments keep working until the env rename is applied in Railway.
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev',
    fromName: process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'BeMore',
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
  admin: {
    email: process.env.ADMIN_SEED_EMAIL || '',
    password: process.env.ADMIN_SEED_PASSWORD || '',
  },
});
