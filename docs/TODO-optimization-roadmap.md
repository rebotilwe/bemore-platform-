# BeMore Platform — Optimization Roadmap

**Audit Date:** 29 March 2026
**Current State:** Summit-ready MVP
**Goal:** Production-grade enterprise platform

---

## Priority 1: CRITICAL (Do within 1 week)

### 1.1 Disable Sourcemaps in Production
- **File:** `frontend/vite.config.ts`
- **Issue:** 366KB sourcemap shipped to production — exposes source code
- **Fix:** Set `sourcemap: false` for production builds
- **Effort:** 5 min

### 1.2 Token Refresh + Auto-Logout
- **Files:** `backend/src/routes/auth.js`, `frontend/src/auth.ts`, `frontend/src/api.ts`
- **Issue:** 8-hour JWT expires without warning. No refresh flow. Expired tokens stay in state until manual navigation. No server-side token revocation.
- **Fix:**
  - Add `POST /api/auth/refresh` endpoint (issue new token if old one is <1hr from expiry)
  - Add `POST /api/auth/logout` endpoint (optional token blacklist)
  - Frontend: intercept 401 responses → auto-logout + redirect to login
  - Frontend: proactive refresh 10min before expiry
- **Effort:** 3-4 hours

### 1.3 Request ID Tracing
- **Files:** `backend/src/middleware/requestLogger.js`, `backend/src/utils/logger.js`
- **Issue:** No correlation IDs in logs. Impossible to trace a single request through the system.
- **Fix:**
  - Middleware: generate `X-Request-Id` (UUID) per request, attach to `req`
  - Logger: include requestId in every log entry
  - Error handler: include requestId in error responses
  - Return `X-Request-Id` in response headers
- **Effort:** 2 hours

### 1.4 Remove Hardcoded Admin Credentials
- **Files:** `backend/src/config/index.js`, `backend/.env.example`
- **Issue:** Default admin password was hardcoded in config fallback
- **Fix:**
  - Remove default values for `JWT_SECRET` and `ADMIN_SEED_PASSWORD`
  - Require env vars — crash on startup if missing in production
  - Rotate all secrets that have been in git history
- **Effort:** 1 hour

### 1.5 Monitoring & Alerting
- **Issue:** Zero monitoring. No metrics, no alerting, no uptime tracking.
- **Fix (lightweight):**
  - Add `/api/health/detailed` endpoint with response times, memory usage, connection counts
  - Set up UptimeRobot or BetterStack for uptime monitoring (free tier)
  - Add Sentry for error tracking (free tier: 5k errors/month)
  - Log response times in requestLogger for later analysis
- **Effort:** 4-6 hours

### 1.6 Structured JSON Logging
- **Files:** `backend/src/utils/logger.js`, `backend/src/middleware/requestLogger.js`
- **Issue:** Logs are unstructured strings. Can't query, filter, or aggregate.
- **Fix:**
  - Configure Winston JSON format: `format: combine(timestamp(), json())`
  - Log fields: `{ requestId, method, path, status, duration, userId, ip }`
  - Add PII redaction for emails, phones in logs
  - Add log level filtering (no debug in production)
- **Effort:** 2-3 hours

---

## Priority 2: HIGH (Do within 2 weeks)

### 2.1 Lazy Loading (Frontend Routes)
- **File:** `frontend/src/router.ts`
- **Issue:** All 20 pages loaded eagerly on startup (190KB single bundle)
- **Fix:**
  - Split admin pages into separate chunk: `page: async () => (await import('./pages/admin/analytics.ts')).analyticsPage`
  - Public pages stay eager (small, always needed)
  - Admin pages lazy-loaded (only when authenticated)
  - Expected savings: ~40% initial bundle size reduction
- **Effort:** 2-3 hours

### 2.2 API Request Timeouts + Retry
- **File:** `frontend/src/api.ts`
- **Issue:** No request timeout (hangs forever on slow network). No retry on transient failure.
- **Fix:**
  - Add `AbortSignal.timeout(10000)` to all fetch calls (10s default)
  - Add retry wrapper: 1 retry with 2s delay for GET requests on network error
  - Add request deduplication for rapid identical calls
- **Effort:** 2 hours

### 2.3 401 Auto-Logout
- **File:** `frontend/src/api.ts`
- **Issue:** 401 responses from expired tokens don't trigger logout
- **Fix:**
  - In the `request()` function, check for 401 status
  - Clear token from store + localStorage
  - Redirect to `/#/admin/login` with a toast "Session expired"
- **Effort:** 30 min

### 2.4 CSV Export Streaming
- **File:** `backend/src/controllers/applicationController.js`
- **Issue:** `getAllApplications()` loads entire collection into memory for CSV export
- **Fix:**
  - Use MongoDB cursor with `.stream()` or `.cursor()`
  - Pipe rows to response as they come from DB
  - Add `.lean()` and `.select()` to exclude unnecessary fields
- **Effort:** 1-2 hours

### 2.5 SMTP Health Check
- **File:** `backend/src/routes/health.js`
- **Issue:** Health endpoint doesn't check email connectivity. Mail failures are silent.
- **Fix:**
  - Add SMTP transporter verify to health check
  - Return `checks.email: 'ok'` or `'disconnected'`
  - Don't block health if SMTP is down — just report degraded
- **Effort:** 30 min

### 2.6 Error Boundaries Per Component
- **Files:** Frontend page mount functions
- **Issue:** Unhandled promise rejections silently fail in component rendering
- **Fix:**
  - Wrap each page's `mount()` async calls in try/catch
  - Show inline error state instead of blank page
  - Log errors to analytics
- **Effort:** 2 hours

### 2.7 FormData Schema Validation
- **File:** `backend/src/routes/applications.js`
- **Issue:** `formData` accepts any object — no size limit, no structure validation
- **Fix:**
  - Add `express.json({ limit: '100kb' })` body size limit
  - Validate formData has expected keys per userType
  - Strip unexpected nested objects
- **Effort:** 2 hours

### 2.8 Compound Database Indexes
- **File:** `backend/src/models/Application.js`
- **Issue:** Missing compound indexes for common query patterns
- **Fix:**
  - Add `{ classification: 1, status: 1 }` compound index
  - Add `{ engagementSource: 1, submittedAt: -1 }` compound index
  - Add index on `actor.email` in AnalyticsEvent model
- **Effort:** 30 min

---

## Priority 3: MEDIUM (Do within 1 month)

### 3.1 Code Splitting (Vite)
- **File:** `frontend/vite.config.ts`
- Add `manualChunks` to separate vendor code from application code
- Split admin CSS from public CSS

### 3.2 Token Storage Security
- Move JWT from localStorage to sessionStorage (cleared on tab close)
- Or use HttpOnly cookie approach (requires backend CSRF protection)

### 3.3 In-Memory Cache Cleanup
- **File:** `backend/src/services/pollService.js`
- Add LRU eviction to voteCounters (max 20 polls cached)
- Flush counters to DB on graceful shutdown
- Add memory usage monitoring

### 3.4 Rate Limiting Audit
- Tighten lookup endpoint: 20 req/15min (from 100)
- Add per-admin rate limits on bulk operations
- Add rate limiting to analytics/insights endpoints

### 3.5 Graceful Shutdown Improvements
- **File:** `backend/server.js`
- Stop accepting new connections first
- Drain in-flight requests (30s timeout)
- Flush analytics events to DB
- Close MongoDB connection pool cleanly

### 3.6 Data Retention (POPIA)
- Add TTL index on Application model (24 months)
- Add admin UI for data deletion requests
- Auto-archive old applications to cold storage

### 3.7 Pagination Consistency
- Paginate poll results (word clouds, open text lists)
- Paginate tag analytics
- Stream CSV exports instead of loading all into memory

### 3.8 Async Logging
- Move Winston to async transport
- Separate log writing from request processing
- Add log rotation (daily files, 30-day retention)

---

## Priority 4: LOW (Future Enhancement)

### 4.1 Backend TypeScript Migration
- Convert `.js` → `.ts` files with strict mode
- Add type definitions for all service functions
- Enable compile-time error catching

### 4.2 Critical CSS Inlining
- Extract above-the-fold CSS into index.html `<style>` tag
- Defer non-critical CSS loading

### 4.3 Database Replication
- Add MongoDB read replica for analytics queries
- Separate read/write connections

### 4.4 WAF (Web Application Firewall)
- Add Cloudflare or AWS WAF in front of Railway
- Rate limiting at edge, bot protection, DDoS mitigation

### 4.5 Load Testing
- Use k6 or Artillery to test 500 concurrent users
- Establish baseline response times
- Find breaking point

### 4.6 i18n (Internationalisation)
- Extract all user-facing strings
- Add Zulu (zu-ZA) and Afrikaans (af-ZA) translations
- Locale-aware date/currency formatting

### 4.7 Notification Queue
- Replace fire-and-forget email calls with a job queue
- Retry failed emails with exponential backoff
- Track delivery status per notification

---

## Quick Wins (< 30 min each)

- [x] Disable sourcemaps in production (`vite.config.ts`: `sourcemap: false`) — DONE 29 Mar
- [x] Add `.lean()` to all admin list queries — DONE 29 Mar
- [x] Add `express.json({ limit: '100kb' })` body size limit — DONE 29 Mar
- [x] Add SMTP verify to health endpoint — DONE 29 Mar
- [x] Add 401 → auto-logout in frontend `request()` function — DONE 29 Mar
- [ ] Add compound index `{ classification: 1, status: 1 }`
- [ ] Move token from localStorage to sessionStorage

---

## Metrics After Optimization

| Metric | Current | Target | How |
|--------|---------|--------|-----|
| Initial JS bundle | 190KB | ~110KB | Lazy loading + code splitting |
| Time to Interactive | ~2.5s | <1.5s | Lazy loading + critical CSS |
| API p95 latency | ~300ms | <100ms | Lean queries + caching |
| Error visibility | 0% | 100% | Sentry + structured logging |
| Uptime monitoring | None | 99.9% | UptimeRobot + health checks |
| Token security | localStorage | sessionStorage/HttpOnly | Storage migration |
| Data retention | Forever | 24 months | TTL indexes |
