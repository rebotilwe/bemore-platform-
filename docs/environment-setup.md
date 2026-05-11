# BeMore Platform -- Environment Setup Guide

This guide walks new developers through setting up the BeMore platform locally and explains the staging and production environments.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20+ | Required for both frontend and backend. Use `nvm` or `fnm` to manage versions. |
| **npm** | 10+ | Ships with Node 20. |
| **MongoDB** | 6+ | Local install, Docker (`mongo:6`), or MongoDB Atlas free tier. |
| **Git** | 2.40+ | Standard. |

Optional but recommended:

- **MongoDB Compass** -- GUI for inspecting collections during development.
- **VS Code** with the ESLint, Prettier, and REST Client extensions.

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url> BeMore
cd BeMore
```

### 2. Backend setup

```bash
cd backend
npm install

# Create your local env file
cp .env.example .env
```

Open `.env` and fill in at minimum:

- `MONGODB_URI` -- your local MongoDB connection string (default is fine if MongoDB runs locally on port 27017).
- `JWT_SECRET` -- any random string for local dev; the default in `.env.example` works but should never be used in production.
- `ADMIN_SEED_PASSWORD` -- password for the initial admin account that is created on first startup.

Start the dev server (auto-restarts on file changes via nodemon):

```bash
npm run dev
# Backend runs on http://localhost:5000
```

On first startup the backend will:
1. Connect to MongoDB (retries 3 times with exponential backoff).
2. Seed an admin user if none exists (using `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`).

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000 (Vite)
# API requests to /api/* are proxied to http://localhost:5000
```

Open `http://localhost:3000` in your browser. The admin panel is at `/#/admin/login`.

### 4. Verify everything works

```bash
# Backend health check
curl http://localhost:5000/api/health

# Run backend tests (uses mongodb-memory-server, no real DB needed)
cd backend && npm test

# Run frontend type-check and tests
cd frontend && npm run typecheck && npx vitest run
```

---

## Environment Variables Reference

All variables are set in `backend/.env`. The frontend has no env vars -- it discovers the backend via a Vite proxy in dev and Vercel rewrites in production.

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP port the Express server listens on. |
| `NODE_ENV` | `development` | `development`, `staging`, or `production`. Controls CORS defaults, logging level, and env-var validation strictness. |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/bemore` | MongoDB connection string. **Required** in production/staging -- the app will exit if missing. |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to sign and verify JWT tokens. **Required** in production/staging. Use a cryptographically random string of 32+ characters. |
| `JWT_EXPIRES_IN` | `8h` | JWT token lifetime. Accepts values like `8h`, `1d`, `30m`. |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window in milliseconds (default 15 minutes). |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests allowed per window per IP. The backend defines additional per-route limiters (health, auth, vote, etc.) on top of this global default. |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | *(auto)* | Comma-separated list of allowed origins. If blank or `*`, the app uses built-in defaults based on `NODE_ENV`: dev includes localhost + prod + staging origins; staging includes staging + bemorecapital.co.za; production includes bemore-tawny.vercel.app + bemorecapital.co.za. |

### Email -- Resend (sole provider; SMTP removed 2026-05-11)

All transactional email is dispatched through Resend. The legacy SMTP fallback path
(nodemailer + `mail.bts-app.co.za`) was removed on 2026-05-11. If `RESEND_API_KEY`
is missing, sends are short-circuited with a logged error and the API call still
succeeds (fire-and-forget pattern).

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | *(empty)* | **REQUIRED in production/staging.** API key from [resend.com](https://resend.com). |
| `EMAIL_FROM` | `onboarding@resend.dev` | Sender address. The default works for any Resend account but only delivers to the API key owner; use a verified domain (e.g. `info@bts-app.co.za`) for real traffic. |
| `EMAIL_FROM_NAME` | `BeMore` | Sender display name. |

**Backwards compatibility:** legacy `SMTP_FROM` and `SMTP_FROM_NAME` env vars are
still read as fallback if `EMAIL_FROM`/`EMAIL_FROM_NAME` are unset, so existing
Railway deployments keep working until the env vars are renamed.

### Platform URL

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_URL` | `https://bemore-tawny.vercel.app` | Base URL of the frontend. Used in email templates for links (e.g. "View your application status"). |

### Admin Seed Account

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_SEED_EMAIL` | *(empty)* | Email for the first admin account, created automatically on startup if no admin users exist in the database. |
| `ADMIN_SEED_PASSWORD` | *(empty)* | Password for the seed admin account. |

---

## Environments

### Development (local)

| Component | URL |
|-----------|-----|
| Frontend (Vite) | `http://localhost:3000` |
| Backend (Express) | `http://localhost:5000` |
| MongoDB | `mongodb://localhost:27017/bemore` |

The Vite dev server proxies `/api/*` requests to the backend, so the frontend and backend can run on different ports without CORS issues.

### Staging

| Component | URL | Deploy trigger |
|-----------|-----|----------------|
| Frontend | `https://bemorecapital.co.za` | Push to `staging` branch (Vercel) |
| Backend | `https://bemore-staging.up.railway.app` | Push to `staging` branch (Railway) |

Staging uses `NODE_ENV=staging`. The backend validates that `JWT_SECRET` and `MONGODB_URI` are set, same as production.

Key differences from production:
- Separate MongoDB database (typically a dedicated Atlas cluster or Railway-managed instance).
- CORS allows staging + bemorecapital.co.za origins.
- Used for QA and stakeholder review before promoting to production.

### Production

| Component | URL | Deploy trigger |
|-----------|-----|----------------|
| Frontend | `https://bemore-tawny.vercel.app` | Push to `main` branch (Vercel) |
| Backend | `https://bemore-production.up.railway.app` | Push to `main` branch (Railway) |

Production uses `NODE_ENV=production`. The Vercel frontend has rewrite rules in `frontend/vercel.json` that proxy `/api/*` to the Railway backend, so the browser only talks to the Vercel domain.

---

## Common Issues and Troubleshooting

### Backend won't start -- "FATAL: Missing required env vars"

The app requires `JWT_SECRET` and `MONGODB_URI` when `NODE_ENV` is `production` or `staging`. For local development make sure your `.env` file exists (copy from `.env.example`).

### MongoDB connection fails / hangs

- Confirm MongoDB is running: `mongosh --eval "db.runCommand({ping: 1})"`.
- If using Docker: `docker run -d -p 27017:27017 --name bemore-mongo mongo:6`.
- The backend retries 3 times with exponential backoff (2s, 4s, 8s) before giving up.

### Frontend shows "Demo Mode" / offline banner

The frontend tries `GET /api/health` on load. If the backend is unreachable, it falls back to localStorage-based demo mode. Make sure the backend is running on port 5000 and the Vite proxy is configured (check `frontend/vite.config.ts`).

### Admin login fails

- Ensure `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are set in `.env`.
- The seed account is only created once -- if you change the password in `.env` after the first run, you need to either:
  - Delete the admin document from the `admins` collection in MongoDB, or
  - Use the existing password.

### Emails not sending

- **Resend**: Set `RESEND_API_KEY` (sole provider as of 2026-05-11). Check the Resend dashboard for delivery status. Failed sends log error strings prefixed `Resend …` to `EmailLog`.
- If `RESEND_API_KEY` is missing the API call still succeeds; sends are short-circuited and logged.
- All email sends are logged to the `emaillogs` MongoDB collection with status `sent` or `failed`.

### Tests fail with "MongoMemoryServer" errors

Backend tests use `mongodb-memory-server` which downloads a MongoDB binary on first run. If behind a corporate proxy, set `HTTPS_PROXY`. If the download times out, run `npx mongodb-memory-server --download` manually.

### Port already in use

```bash
# Find and kill the process on port 5000 (Unix/macOS)
lsof -ti :5000 | xargs kill

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### CORS errors in the browser

Check that the frontend origin is included in the CORS allow list. In development, `http://localhost:3000` and `http://localhost:5173` are allowed by default. If you are running the frontend on a different port, add it to `CORS_ORIGIN` in `.env`.

### Rate limiting during development

The auth endpoint is limited to 10 requests per 15 minutes. If you hit the limit during testing, restart the backend to reset in-memory counters, or increase `RATE_LIMIT_MAX_REQUESTS` in `.env`.
