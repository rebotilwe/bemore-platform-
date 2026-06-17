# BeMore Platform — May Hardening Sprint Design

**Date:** 2026-05-11
**Branch strategy:** One PR per logical group, merged to `staging` then `main`
**Scope:** P1 Critical + P2 High + Quick Wins (full roadmap clearance)

---

## Overview

Four sequential branches ship independent concerns. Each is independently reviewable and rollback-safe. Observability ships before validation so any bugs in validation have traces attached.

| Branch | Items | Est. effort |
|--------|-------|-------------|
| `fix/auth-security` | sessionStorage migration, token refresh, compound indexes | 4-5 hrs |
| `fix/observability` | Request ID tracing, health/detailed, Sentry | 4-5 hrs |
| `fix/performance` | Lazy-load admin routes, CSV streaming, remaining indexes | 3-4 hrs |
| `fix/validation` | FormData schema validation per userType | 2-3 hrs |

---

## Group 1 — `fix/auth-security`

### 1.1 Move JWT from `localStorage` → `sessionStorage`

**Files:** `frontend/src/auth.ts`, `frontend/src/api.ts`

Replace all `localStorage.getItem/setItem/removeItem('bm_token')` calls with `sessionStorage` equivalents. Token is cleared when the tab closes, reducing XSS exposure window. No API changes required — the token is still passed as a Bearer header.

### 1.2 Token Refresh Endpoint (backend)

**File:** `backend/src/routes/auth.js`, `backend/src/controllers/authController.js` (or `backend/src/services/authService.js`)

- New route: `POST /api/auth/refresh` — JWT-protected (requires valid Bearer token)
- Decodes the existing token; **only issues a new token if < 1 hour remains** — prevents unlimited token extension
- Issues a fresh 8h token using the same `JWT_SECRET` and `JWT_EXPIRES_IN` config
- Logs to `AdminAuditLog` with action `token.refresh` and `actor.email`
- Returns `{ token }` on success; 401 if token is expired, 403 if > 1h remaining

### 1.3 Proactive Frontend Refresh

**File:** `frontend/src/auth.ts`

- After `verifySession()` succeeds, decode the JWT `exp` claim (base64 split — no extra library)
- Schedule a `setTimeout` to fire 10 minutes before expiry, calling `POST /api/auth/refresh`
- On refresh success: update token in sessionStorage, reschedule the next timeout
- On refresh failure (network error or 401/403): call `logout()` → clear token → redirect to `/#/admin/login` with toast "Session expired, please log in again"
- Cancel the timeout on explicit logout

### 1.4 Compound DB Indexes (Quick Win)

**Files:** `backend/src/models/Application.js`, `backend/src/models/AnalyticsEvent.js`

Add the following indexes:

```js
// Application.js
ApplicationSchema.index({ classification: 1, status: 1 });
ApplicationSchema.index({ engagementSource: 1, submittedAt: -1 });

// AnalyticsEvent.js
AnalyticsEventSchema.index({ 'actor.email': 1 });
```

Mongoose auto-creates these on startup (`autoIndex: true` in dev/staging; migration note: run `db.collection.createIndex()` manually in production before deploying if index build time is a concern).

### Tests

New file: `backend/__tests__/auth-refresh.test.js`

| Case | Expected |
|------|----------|
| Valid token with < 1h remaining | 200, new token returned |
| Valid token with > 1h remaining | 403 |
| Expired token | 401 |
| No token | 401 |
| Malformed token | 401 |

---

## Group 2 — `fix/observability`

### 2.1 Request ID Tracing

**Files:** `backend/src/middleware/requestLogger.js`, `backend/src/utils/logger.js`, `backend/src/middleware/errorHandler.js`, `backend/src/app.js`

- New middleware (mounted before routes in `app.js`): generates `req.requestId = uuid()` per request
- Sets `X-Request-Id` response header
- Winston logger updated: every log entry includes `requestId` from `req.requestId` (pass via child logger or log metadata)
- `requestLogger.js` already logs per-request — add `requestId` to the log line
- `errorHandler.js`: include `requestId` in the error response body: `{ message, requestId }`

Implementation note: use `AsyncLocalStorage` or pass `req.requestId` explicitly to service/utility calls that log — do NOT use a global. Simple explicit passing is preferred.

### 2.2 `GET /api/health/detailed`

**File:** `backend/src/routes/health.js`

- New route, JWT-protected (admin only)
- Response shape:

```json
{
  "status": "ok",
  "uptime": 3600,
  "memory": { "heapUsed": 45000000, "heapTotal": 67000000, "rss": 89000000 },
  "database": { "status": "ok", "latencyMs": 4 },
  "email": { "status": "ok" },
  "version": "1.0.0",
  "timestamp": "2026-05-11T10:00:00.000Z"
}
```

- DB latency: `Date.now()` diff around `mongoose.connection.db.admin().ping()`
- Email: reuse the existing SMTP verify already wired in the simple health check
- Memory: `process.memoryUsage()`
- Uptime: `process.uptime()` (seconds)
- Version: from `package.json`
- Never returns 5xx — degraded subsystems return `"status": "degraded"` with reason, overall status becomes `"degraded"`

### 2.3 Sentry Integration

**Backend:** `backend/src/app.js`

```js
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

- Sentry request handler mounted first, error handler mounted last (before existing errorHandler)
- No-ops gracefully if `SENTRY_DSN` is not set (Sentry SDK handles this)
- Add `SENTRY_DSN` to `.env.example` and Railway env vars

**Frontend:** `frontend/src/main.ts`

```ts
import * as Sentry from '@sentry/browser';
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
```

- Init before router starts
- No-ops if `VITE_SENTRY_DSN` is not set
- Add `VITE_SENTRY_DSN` to `frontend/.env.example` and Vercel env vars

**No PII in Sentry:** Configure `beforeSend` hook to strip `email`, `phone` fields from event data (POPIA requirement).

---

## Group 3 — `fix/performance`

### 3.1 Lazy-Load Admin Routes

**File:** `frontend/src/router.ts`

Convert all admin page imports from static to dynamic:

```ts
// Before
import { dashboardPage } from './pages/admin/dashboard';

// After
page: async () => (await import('./pages/admin/dashboard')).dashboardPage
```

Public routes (`hero`, `gateway`, `form`, `success`, `about/*`, `landing`, `status`) stay eagerly imported — they are always needed and small.

All 11 admin routes (`dashboard`, `leads`, `analytics`, `traffic`, `reports`, `deal-room`, `audit-log`, `qr`, `guide`, `settings`, `login`) become lazy.

Expected outcome: ~40% reduction in initial JS bundle served to unauthenticated users.

### 3.2 CSV Export Streaming

**File:** `backend/src/controllers/applicationController.js`

Replace the `exportCSV` handler's `find().lean()` (loads all docs into memory) with a cursor-based stream:

```js
const cursor = Application.find(filter).lean().select(EXPORT_FIELDS).cursor();
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
// write CSV header row, then pipe cursor rows through CSV transform to res
cursor.on('data', (doc) => res.write(rowToCsv(doc)));
cursor.on('end', () => res.end());
cursor.on('error', (err) => next(err));
```

Formula-injection prevention (already present in `csvUtils`) stays in place.

### 3.3 Indexes

All compound indexes (`{ classification: 1, status: 1 }`, `{ engagementSource: 1, submittedAt: -1 }`, and `{ 'actor.email': 1 }` on AnalyticsEvent) are defined in Group 1 (§1.4) and ship in `fix/auth-security`. No additional index work in this group.

---

## Group 4 — `fix/validation`

### 4.1 FormData Schema Validation per userType

**File:** `backend/src/middleware/validate.js` (new `validateFormData` middleware) or inline in `backend/src/routes/applications.js`

After existing `express-validator` checks pass, validate `formData` shape based on `userType`:

| userType | Required keys in `formData` |
|----------|-----------------------------|
| `developer` | `projectStage`, `estimatedValue` |
| `aspiring` | `projectStage`, `estimatedValue` |
| `investor` | `investmentAmount`, `investmentHorizon`, `investmentFocus` |
| `landowner` | `landSize`, `zoningStatus`, `developmentAppetite` |
| `student` | `totalBedCount`, `averageOccupancy`, `nsfasAccreditation` |
| `professional` | `profession`, `registrationBody`, `yearsExperience` |

**Behaviour:**
- Missing required keys → 422 with `{ message: 'Invalid form data', errors: [{ field: 'formData.investmentAmount', message: 'Required' }] }`
- Extra/unexpected top-level keys in `formData` are stripped (not rejected) before the document is passed to the service layer
- `formData` values are not deeply validated (too complex, too fragile) — only presence of required keys is checked

**Body size limit:** Already shipped (`express.json({ limit: '100kb' })`) — not re-done.

**Tests:** Extend `backend/__tests__/applications.test.js` with cases per userType: missing required key returns 422, extra keys are stripped, valid payload passes through.

---

## Environment Variables

| Group | Variable | Where |
|-------|----------|-------|
| 2 (Sentry) | `SENTRY_DSN` | Railway (both envs) |
| 2 (Sentry) | `VITE_SENTRY_DSN` | Vercel (both envs) |

---

## Deployment Order

1. `fix/auth-security` → staging → verify auth flow → merge to main
2. `fix/observability` → staging → check logs for requestId, hit `/api/health/detailed` → merge to main
3. `fix/performance` → staging → verify admin routes lazy-load, test CSV export on large dataset → merge to main
4. `fix/validation` → staging → submit test payloads per userType → merge to main

---

## Out of Scope (P3 — future sprint)

- Code splitting (`manualChunks` in Vite)
- Rate limiting audit (tighten lookup endpoint)
- Graceful shutdown improvements
- POPIA TTL indexes (24-month auto-delete)
- Async logging (Winston async transport)
- Backend TypeScript migration
