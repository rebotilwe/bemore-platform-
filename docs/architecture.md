# BeMore Platform Architecture

**Last updated**: 24 Apr 2026

---

## 1. System Overview

BeMore is a live engagement and data capture platform for the BeMore SME Access Initiative, connecting South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding partnerships through PBSA.

The platform is a full-stack SPA with an offline-capable demo mode, deployed across two environments (staging and production) using Vercel for static hosting and Railway for the API backend.

### High-Level System Diagram

```
                              INTERNET
                                 |
               +-----------------+-----------------+
               |                                   |
        [ Public Users ]                    [ Admin Users ]
        (apply, check status,               (manage leads,
         vote on polls)                      analytics, polls)
               |                                   |
               +-----------------------------------+
                                 |
                          [ Browser SPA ]
                       Vanilla TypeScript
                       Hash-based routing
                                 |
               +-----------------+-----------------+
               |                                   |
      (Static Assets)                       (API Requests)
               |                                   |
               v                                   v
        +-------------+     Vercel Rewrites   +------------------+
        |   Vercel     | ---- /api/:path* --> |    Railway        |
        |   (CDN)      |                      |    (Express API)  |
        |              |                      |                   |
        | index.html   |                      | Port 5000         |
        | /assets/*    |                      | Helmet, CORS      |
        | /icons/*     |                      | Rate Limiting     |
        | SW v2        |                      | JWT Auth (cookie)  |
        +--------------+                      +--------+----------+
                                                       |
                                                       v
                                              +------------------+
                                              |    MongoDB       |
                                              |                  |
                                              | Applications     |
                                              | Admins           |
                                              | Polls            |
                                              | AnalyticsEvents  |
                                              | PageViews        |
                                              | TrackingEvents   |
                                              | EmailLogs        |
                                              | SiteSettings     |
                                              | AdminAuditLogs   |
                                              +------------------+
```

### Environment Topology

```
STAGING
-------
  Browser
    |
    v
  bemorecapital.co.za  (Vercel, auto-deploy from staging branch)
    |
    | /api/* rewrite
    v
  bemore-staging.up.railway.app  (Express, Railway staging)
    |
    v
  mongodb.railway.internal:27017/bemore_staging  (Railway MongoDB)


PRODUCTION
----------
  Browser
    |
    v
  bemore-tawny.vercel.app  (Vercel, auto-deploy from main branch)
    |
    | /api/* rewrite
    v
  bemore-production.up.railway.app  (Express, Railway production)
    |
    v
  MongoDB Atlas  (managed cloud)
```

### Branch Strategy

```
  feature/* ---PR---> staging ---promote---> main
                        |                     |
                    Vercel staging         Vercel production
                    Railway staging        Railway production
```

---

## 2. Frontend Architecture

**Stack**: Vite + vanilla TypeScript (no framework), PWA-enabled

### Directory Structure

```
frontend/src/
  main.ts            App init, Vercel analytics/speed-insights, SW registration
  router.ts          Hash-based SPA router with auth guards
  api.ts             API client with localStorage demo fallback
  store.ts           Reactive state (get/set/subscribe pattern)
  auth.ts            JWT auth + CSRF + session verification
  pages/
    public/          hero, gateway, form, success, about, landing, mentee-meter, status
    admin/           login, dashboard, leads, analytics, reports, deal-room,
                     audit-log, qr-generator, polls, traffic, guide, settings, admins
  components/        nav, toast, confirm-dialog, loading-button, empty-state,
                     error-boundary, app-detail-modal, poll-results-chart
  constants/         categories, funders (PBSA), status, tags, form-steps, summit-config
  types/             application, api, routes
  services/          poll-sse (SSE client), tracker (page views, events, heartbeat)
  utils/             validation, auto-tag, format, csv, dom, pdf-report
  styles/            tokens, reset, typography, base, components/*, pages/*
```

### Hash-Based Router

The router listens for `hashchange` events and resolves routes from a static table. Routes use the `/#/path` convention (e.g., `/#/admin/dashboard`).

```
  hashchange event
       |
       v
  matchRoute(path)
       |
       +--- public routes: load eagerly, render with nav + <main>
       |
       +--- admin routes: lazy-load via dynamic import(), verify session,
       |                  render inside admin layout (sidebar + content)
       |
       +--- no match: render 404 page with navigation links
```

- **Auth guard**: Admin routes call `authGuard()` (sync store check) then `verifySession()` (async `GET /api/auth/verify`). On failure, redirect to `/#/admin/login`.
- **Lazy loading**: Admin page modules are loaded via `import()` on first navigation, not bundled with the initial payload.
- **Page lifecycle**: Each page exports `render(): string` (returns HTML) and optional `mount()`/`unmount()` methods for DOM event binding and cleanup.

### Reactive Store

A singleton `Store` class with typed `get(key)`, `set(key, value)`, and `subscribe(key, callback)` methods. Subscribers are notified synchronously on state changes. No external library.

Key state:
- `useApi` (boolean) -- true when backend is reachable
- `isAuthenticated` / `adminEmail` -- auth state
- `selectedProfile` / `formData` / `currentStep` -- multi-step form wizard
- `applications` / `filters` / `stats` -- admin data
- `pollsEnabled` -- feature toggle from site settings

### API Client

All API calls go through a central `request<T>(method, path, body)` function that:
- Sends `credentials: 'include'` (cookies) automatically via fetch
- Attaches `X-CSRF-Token` header on state-changing methods (POST, PUT, PATCH, DELETE)
- Applies 15-second timeout with `AbortController`
- Retries GET requests once on network/timeout errors (2-second delay)
- Auto-logs out on 401 responses (expired JWT)

The API URL is always relative (`/api`) -- Vercel rewrites handle routing to the backend.

### Demo Mode (Offline Fallback)

On startup, `main.ts` calls `api.checkBackend()` (probes `GET /api/health`). If the backend is unreachable:
- `store.set('useApi', false)` activates demo mode
- All CRUD operations fall back to `localStorage` via `localStore`
- Auto-tagging runs client-side
- Reference numbers are generated locally (`BM-XXXXXXXX`)
- Admin login accepts any credentials

### PWA / Service Worker

- **Manifest**: `public/manifest.json` with app name, icons, theme color
- **Service Worker v2**: Registered from `main.ts`, uses stale-while-revalidate strategy
- **Precache**: Logo, icons, and app shell
- **Install prompt**: Banner prompts users to install on supported browsers
- **Cache headers**: Hashed assets (`/assets/*`) get `Cache-Control: public, max-age=31536000, immutable`

---

## 3. Backend Architecture

**Stack**: Express.js (ESM), Mongoose ODM, Node 20+

### Startup Sequence

```
  server.js
    |
    +--- dotenv/config (load .env)
    +--- createApp() (Express factory)
    +--- connectDb() (MongoDB with 3 retries, exponential backoff: 2s/4s/8s)
    +--- seedAdmin() (create admin from env if not exists)
    +--- app.listen(PORT)
    +--- register SIGTERM/SIGINT handlers for graceful shutdown
```

Graceful shutdown: stop accepting connections, wait 15 seconds for in-flight requests, disconnect MongoDB, exit.

### Express App Factory (`createApp()`)

Middleware stack applied in order:

```
  1. trust proxy (1)              -- accurate client IP behind Railway proxy
  2. requestLogger                -- Winston structured log per request
  3. compression()                -- gzip response bodies
  4. express.json({ limit: 100kb })
  5. cookieParser()               -- parse bm_token and bm_csrf cookies
  6. cors(config)                 -- explicit origin whitelist, credentials
  7. helmet()                     -- security headers
  8. routes (/api/*)              -- all route handlers
  9. 404 handler                  -- catch-all
 10. errorHandler                 -- centralized error response
```

### Controller / Service / Model Pattern

```
  Route
    |
    +--- Rate limiter (per-tier)
    +--- Auth middleware (JWT from cookie) [admin routes only]
    +--- CSRF protection [state-changing admin routes]
    +--- Validation middleware (express-validator)
    |
    v
  Controller  --- orchestrates request/response, calls service
    |
    v
  Service     --- business logic, data access via Mongoose models
    |
    v
  Model       --- Mongoose schema, indexes, pre-save hooks
```

Controllers:
- `applicationController` -- CRUD, stats, bulk status, reminders, POPIA endpoints
- `authController` -- login (set httpOnly cookie), verify, logout (clear cookie)
- `adminController` -- admin CRUD (list, create, update, delete)
- `analyticsController` -- dashboard, funnel, trends, tags, demographics, deal room
- `reportController` -- pre-built reports (high-value, pipeline-ready, etc.)
- `pollController` -- poll CRUD, voting, SSE live stream, results
- `trafficController` -- traffic overview, trends, referrers, devices, hours, funnel, clicks

Services:
- `applicationService` -- duplicate detection (email + userType), sanitized updates
- `authService` -- bcrypt password verification, JWT signing/verification
- `analyticsService` -- MongoDB aggregation pipelines with date/timezone handling
- `reportService` -- filtered queries for curated report views
- `pollService` -- poll lifecycle management, vote recording, result aggregation
- `pollSSE` -- in-memory SSE pub/sub (Map of pollId to Set of client responses)
- `trafficService` -- page view and event aggregation with UA parsing

### Structured Logging (Winston)

All logging uses Winston with JSON format. No `console.log` in production.

Log points:
- Request entry/exit (requestLogger middleware)
- Service boundary operations (application create, status change, etc.)
- External calls (email send attempts)
- Auth events (login, failed login, token verification)
- Startup and shutdown lifecycle
- Error handler (unhandled errors with stack trace)

---

## 4. Data Model

### Entity Relationship Overview

```
  +-------------------+        +------------------+
  |   Application     |        |     Admin        |
  |-------------------|        |------------------|
  | refNumber (unique)|        | email (unique)   |
  | userType          |        | password (bcrypt)|
  | personal          |        | name             |
  | formData (Mixed)  |        | createdAt        |
  | tags []           |        +--------+---------+
  | status            |                 |
  | classification    |                 | creates
  | engagementSource  |                 v
  | dealRoom          |        +------------------+
  | followUp          |        |     Poll         |
  | adminNotes        |        |------------------|
  | submittedAt       |        | title            |
  | updatedAt         |        | description      |
  +-------------------+        | questions []     |
         |                     |   text           |
         | TTL: 24 months      |   type (MC/WC/   |
         |                     |     rating/text) |
         |                     |   options []     |
  +-------------------+       |   settings       |
  |   EmailLog        |        | activeQuestionIdx|
  |-------------------|        | status (draft/   |
  | to (redacted)     |        |   active/paused/ |
  | subject           |        |   closed)        |
  | template          |        | createdBy -> Admin
  | refNumber         |        +--------+---------+
  | status (sent/fail)|                 |
  | error             |                 v
  | sentAt            |        +------------------+
  | TTL: 24 months    |        |  PollResponse    |
  +-------------------+        |------------------|
                               | pollId -> Poll   |
                               | questionId       |
  +-------------------+        | sessionId        |
  | AdminAuditLog     |        | optionId         |
  |-------------------|        | textResponse     |
  | admin.id/email    |        | ratingValue      |
  | action            |        | engagementSource |
  | target            |        | ip, timestamp    |
  | details (Mixed)   |        +------------------+
  | ip, userAgent     |        unique: (sessionId,
  | requestId         |                questionId)
  | status            |
  | errorMessage      |
  | timestamp         |
  | TTL: 7 years      |
  +-------------------+


  +-------------------+        +------------------+
  |   PageView        |        | TrackingEvent    |
  |-------------------|        |------------------|
  | sessionId         |        | sessionId        |
  | visitorId         |        | visitorId        |
  | path              |        | category (click/ |
  | referrer          |        |   form_funnel/   |
  | utm* fields       |        |   interaction/   |
  | device { type,    |        |   scroll/        |
  |   browser, os }   |        |   download)      |
  | ip                |        | action           |
  | screenWidth/Height|        | label, value     |
  | duration          |        | path             |
  | timestamp         |        | meta (Mixed)     |
  | TTL: 1 year       |        | ip, userAgent    |
  +-------------------+        | timestamp        |
                               | TTL: 1 year      |
                               +------------------+

  +-------------------+        +------------------+
  | AnalyticsEvent    |        | SiteSettings     |
  |-------------------|        |------------------|
  | event             |        | key (unique)     |
  | category          |        | value (Mixed)    |
  | actor {type,      |        | updatedAt        |
  |   id, email}      |        +------------------+
  | target {model,    |
  |   id, refNumber}  |
  | meta (Mixed)      |
  | ip, userAgent     |
  | timestamp         |
  | TTL: 1 year       |
  +-------------------+
```

### Auto-Tagging Engine

A Mongoose `pre('save')` hook on the Application model runs `autoTag(userType, formData)` to assign intelligence tags:

| Category | Tags |
|----------|------|
| Value | `HIGH_VALUE`, `LARGE_CAPITAL`, `MID_VALUE` |
| Stage | `LAND_SECURED`, `FUNDING_STAGE`, `SHOVEL_READY` |
| Composite | `PIPELINE_READY`, `INSTITUTIONAL_GRADE` |
| Profile | `EXPERIENCED`, `STUDENT_FOCUS`, `LARGE_OPERATOR`, `REGISTERED` |

Tags drive the four pre-built reports: High-Value Developers, Pipeline-Ready Land, Institutional-Grade Housing, and Deal Room Shortlist.

### TTL (Time-to-Live) Indexes

| Collection | TTL | Reason |
|------------|-----|--------|
| Application | 24 months | POPIA data retention limit |
| EmailLog | 24 months | POPIA compliance |
| AdminAuditLog | 7 years | FICA audit requirements |
| PageView | 1 year | Analytics retention |
| TrackingEvent | 1 year | Analytics retention |
| AnalyticsEvent | 1 year | Analytics retention |

---

## 5. Authentication and Authorization

### Login Flow

```
  Browser                     Express API                     MongoDB
    |                             |                              |
    |  POST /api/auth/login       |                              |
    |  { email, password }        |                              |
    |---------------------------->|                              |
    |                             |  Admin.findOne({ email })    |
    |                             |----------------------------->|
    |                             |  <--- admin doc              |
    |                             |  bcrypt.compare(password)    |
    |                             |                              |
    |                             |  jwt.sign({ id, email })     |
    |                             |  Generate CSRF token (UUID)  |
    |                             |                              |
    |  Set-Cookie: bm_token=JWT   |                              |
    |    (httpOnly, secure,       |                              |
    |     sameSite=strict,        |                              |
    |     path=/, maxAge=8h)      |                              |
    |  Set-Cookie: bm_csrf=UUID   |                              |
    |    (sameSite=strict,        |                              |
    |     NOT httpOnly)           |                              |
    |  Body: { csrfToken: UUID }  |                              |
    |<----------------------------|                              |
    |                             |                              |
    |  Store csrfToken in         |                              |
    |  sessionStorage             |                              |
```

### Token Architecture

- **JWT**: Stored in `bm_token` httpOnly cookie. Contains `{ id, email }`. Expires per `JWT_EXPIRES_IN` (default 8h). Signed with `JWT_SECRET` (HS256).
- **CSRF**: Double-submit cookie pattern. Server sets `bm_csrf` cookie (readable by JS) and returns the token in the response body. Client stores it in `sessionStorage` and sends it as `X-CSRF-Token` header on every state-changing request.

### CSRF Protection

Applied to all admin routes. Skips safe methods (GET, HEAD, OPTIONS) and the login endpoint. Validates that `bm_csrf` cookie matches `X-CSRF-Token` header.

### Session Verification

On every admin page navigation, the router calls `GET /api/auth/verify` which validates the JWT cookie server-side. If invalid or expired, the user is redirected to the login page and auth state is cleared.

### Admin Seeding

On startup, `seedAdmin()` checks if an admin account exists with the email from `ADMIN_SEED_EMAIL`. If not, it creates one with the bcrypt-hashed password from `ADMIN_SEED_PASSWORD`. In production, password re-seeding is intentionally skipped to prevent credential re-seeding attacks.

### Auto-Logout

The frontend API client detects 401 responses on authenticated requests and automatically:
1. Clears `isAuthenticated` and `adminEmail` from the store
2. Removes the CSRF token from sessionStorage
3. Redirects to `/#/admin/login`

---

## 6. Email System

### Provider Architecture

```
  sendEmail({ to, subject, html, text })
       |
       +--- Try Resend API first (if RESEND_API_KEY configured)
       |       |
       |       +--- Success: return { provider: 'resend', id }
       |       |
       |       +--- Failure: fall through to SMTP
       |
       +--- Try SMTP fallback (if SMTP_HOST configured)
       |       |
       |       +--- Success: return { provider: 'smtp' }
       |       |
       |       +--- Failure: return { success: false }
       |
       +--- Neither configured: log error, return failure
```

**Resend** (primary): Cloud email API via `resend` npm package. Configured with `RESEND_API_KEY`.

**SMTP** (fallback): Nodemailer with `mail.bts-app.co.za:465` (TLS). Connection verified on startup (non-blocking). Timeouts: connect 15s, greeting 15s, socket 30s.

### Email Templates

All emails use a shared `buildEmail()` function that generates branded HTML:
- Header: BeMore logo on dark background
- Co-branding bar: "BeMore x PBSA -- Institutional Funding Partnership"
- Body: Heading, greeting, content, reference number card, CTA buttons
- Footer: Company details and platform link

Three template types:
1. **Submission Confirmation** (`sendSubmissionConfirmation`) -- sent on new application
2. **Status Notification** (`sendStatusNotification`) -- sent on status change (reviewing, shortlisted, invited, funded)
3. **Summit Reminder** (`sendSummitReminder`) -- admin-triggered bulk or individual reminders

### Email Logging

Every send attempt is logged to the `EmailLog` collection with:
- Redacted recipient email (POPIA)
- Subject, template name, reference number
- Status (`sent` or `failed`)
- Error message (on failure)

---

## 7. Analytics Pipeline

### Client-Side Tracking

```
  Browser (tracker.ts)
    |
    +--- Page navigation: trackPageView(path)
    |       sends: sessionId, visitorId, path, referrer, UTM params,
    |              screen dimensions, user agent
    |
    +--- CTA clicks: data-track attributes on elements
    |       captured via delegated event listener
    |       sends: category='click', action, label, path
    |
    +--- Form funnel: trackEvent('form_funnel', step)
    |       tracks progression through the 5-step application form
    |
    +--- Session heartbeat: periodic ping to update duration
    |
    v
  POST /api/track/pageview     --> PageView collection
  POST /api/track/event        --> TrackingEvent collection
  POST /api/track/heartbeat    --> updates PageView duration
```

- **Transport**: `navigator.sendBeacon()` preferred (non-blocking, survives page unload), falls back to `fetch`
- **Rate limit**: 300 requests per 15 minutes per IP (trackingLimiter)
- **UA parsing**: Server-side via `ua-parser-js` (device type, browser, OS)
- **TTL**: Both collections auto-delete after 1 year

### Server-Side Analytics

The `analyticsService` and `trafficService` run MongoDB aggregation pipelines against the tracking collections:

| Endpoint | Data |
|----------|------|
| `GET /api/insights/dashboard` | KPIs: total apps, by status, by type, conversion rate |
| `GET /api/insights/funnel` | Application status funnel (new -> reviewing -> shortlisted -> invited -> funded) |
| `GET /api/insights/trends` | Time-series submission data (day/week/month granularity) |
| `GET /api/insights/tags` | Tag distribution across applications |
| `GET /api/insights/demographics` | User type and geographic breakdown |
| `GET /api/insights/deal-room` | Deal room metrics (summit access, funder alignment) |
| `GET /api/insights/traffic` | Page views, sessions, unique visitors, bounce rate |
| `GET /api/insights/traffic/trends` | Traffic time-series |
| `GET /api/insights/traffic/referrers` | Top referral sources |
| `GET /api/insights/traffic/devices` | Device type, browser, OS breakdown |
| `GET /api/insights/traffic/hours` | Hourly heatmap |
| `GET /api/insights/traffic/form-funnel` | Form step completion rates |
| `GET /api/insights/traffic/clicks` | Top CTA clicks |

All date aggregations use `Africa/Johannesburg` timezone.

---

## 8. Live Polls

### Poll Lifecycle

```
  draft ----activate----> active ----pause----> paused
    ^                       |                     |
    |                       |                     |
    +-------reopen----------+-----resume----------+
                            |
                            +-------close--------> closed
```

Statuses: `draft`, `active`, `paused`, `closed`

### Poll Architecture

Each poll contains one or more questions, each with a type:
- `multiple-choice` -- select from options (configurable max selections)
- `word-cloud` -- free-text responses aggregated into a cloud
- `rating` -- numeric scale (5 or 10)
- `open-text` -- free-form text response

The `activeQuestionIndex` field controls which question is currently displayed to voters. Admins advance questions via `PATCH /api/polls/:id/activate`.

### Real-Time SSE (Server-Sent Events)

```
  Voter Browser                 Express API              Admin Browser
       |                            |                         |
       |  GET /api/polls/:id/live   |                         |
       |  (SSE connection)          |   GET /api/polls/:id/live
       |<-- event: connected -------|-----> event: connected  |
       |                            |                         |
       |  POST /api/polls/:id/vote  |                         |
       |--------------------------->|                         |
       |                            |  pollSSE.broadcast()    |
       |<-- event: results ---------|-----> event: results    |
       |                            |                         |
       |   :keepalive (30s)         |    :keepalive (30s)     |
       |<---------------------------|------------------------>|
```

Implementation (`pollSSE.js`):
- In-memory `Map<pollId, Set<ServerResponse>>` for client tracking
- `addClient(pollId, res)` -- sets SSE headers, sends `connected` event, registers cleanup on disconnect
- `broadcast(pollId, eventName, data)` -- sends JSON event to all clients for a poll
- `removeClient(pollId, res)` -- removes client, cleans up empty sets and keepalive timers
- **Keepalive**: 30-second interval comment (`:keepalive`) to prevent proxy/browser timeout
- **Proxy buffering**: disabled via `X-Accel-Buffering: no` header

Events:
- `connected` -- initial connection confirmation with pollId and timestamp
- `results` -- updated vote tallies after each vote
- `question-change` -- when admin activates a different question
- `poll-status` -- when poll status changes (paused, closed, etc.)

### Vote Deduplication

Unique compound index on `(sessionId, questionId)` in PollResponse prevents double-voting. Rate limited to 60 votes per 15 minutes per session/IP.

---

## 9. Security Controls

### HTTP Security Headers (Vercel)

Set via `vercel.json` on all responses:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Restricts script-src, style-src, font-src, connect-src, frame-ancestors, base-uri, form-action |

### Content Security Policy

```
default-src 'self';
script-src  'self' https://va.vercel-scripts.com;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src    'self' https://fonts.gstatic.com;
img-src     'self' data: blob:;
connect-src 'self' https://bemore-staging.up.railway.app
                   https://va.vercel-scripts.com
                   https://vitals.vercel-insights.com
                   https://fonts.googleapis.com
                   https://fonts.gstatic.com;
frame-ancestors 'none';
base-uri        'self';
form-action     'self';
```

### Rate Limiting

Six tiers, all using `express-rate-limit` with standard headers:

| Limiter | Window | Max | Key | Applied To |
|---------|--------|-----|-----|-----------|
| `healthLimiter` | 1 min | 200 | IP | `GET /api/health` |
| `publicApplicationLimiter` | 15 min | 100 | IP | Public application endpoints |
| `adminLimiter` | 15 min | 300 | IP | All admin-authenticated routes |
| `authLimiter` | 15 min | 10 | IP | `POST /api/auth/login` |
| `voteLimiter` | 15 min | 60 | sessionId or IP | `POST /api/polls/:id/vote` |
| `trackingLimiter` | 15 min | 300 | IP | `POST /api/track/*` |

All rate limiters are skipped in `NODE_ENV=test`.

### PII Redaction (POPIA)

The `redactPII` utility (`backend/src/utils/redactPII.js`) auto-redacts before logging:

| PII Type | Pattern | Redacted Form |
|----------|---------|---------------|
| Email | `user@example.com` | `u***@example.com` |
| SA Phone | `+27123456789` | `+27*****6789` |
| SA ID Number | `1234567890123` | `******890***` |
| IPv4 | `192.168.1.1` | `192.168.*.*` |
| IPv6 | Full address | `[REDACTED_IPv6]` |
| Passwords/Tokens | Any matching key | `[REDACTED]` |

### POPIA Compliance Endpoints

Public, no authentication required:

- `POST /api/applications/data-export` -- returns full application data for `{ refNumber, email }` match
- `POST /api/applications/data-delete` -- permanently deletes application data with `{ refNumber, email, confirm: 'DELETE' }`

TTL indexes enforce automatic deletion after 24 months (Application, EmailLog).

### Input Validation and XSS Hardening

- Request body size limited to 100KB (`express.json({ limit: '100kb' })`)
- `express-validator` for route-level input validation
- Email max length: 254 characters
- Classification field validated against enum whitelist in `sanitizeUpdate`
- Poll updates use whitelist-based field assignment (no prototype pollution)
- CSV export escapes formula injection (prefixes `=`, `+`, `-`, `@` cells)
- Mongoose CastError handler strips raw values from error responses
- Email `fromName` sanitized to strip CR/LF (header injection prevention)
- Settings API enforces `ALLOWED_SETTINGS` whitelist for writes

### CORS Configuration

Explicit origin whitelist per environment (no wildcard):

- **Production**: `bemore-tawny.vercel.app`, `bemorecapital.co.za`, `www.bemorecapital.co.za`
- **Staging**: `bemorecapital.co.za`, `www.bemorecapital.co.za`, `bemore-staging.up.railway.app`
- **Development**: `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, `127.0.0.1:3000` (plus prod+staging)

Credentials enabled. Methods restricted to `GET, POST, PUT, PATCH, DELETE, OPTIONS`.

---

## 10. Deployment Architecture

### CI/CD Pipeline

```
  Developer pushes to main / staging / develop
       |
       v
  GitHub Actions (.github/workflows/ci.yml)
       |
       +--- Job 1: Backend Tests
       |       npm ci
       |       npm test (Jest + mongodb-memory-server, --runInBand)
       |       Upload coverage artifact
       |
       +--- Job 2: Frontend Tests
       |       tsc --noEmit (type checking)
       |       vitest run (unit tests)
       |       npm run build (production build)
       |
       +--- Job 3: Security Scan (non-blocking)
               npm audit --audit-level=critical (backend)
               npm audit --audit-level=critical (frontend)
               continue-on-error: true
```

All three jobs run on Ubuntu with Node 20.

### Vercel Deployment (Frontend)

- **Trigger**: Auto-deploy on push to `main` (production) or `staging` (staging)
- **Build**: `npm run build` via Vite, output to `dist/`
- **Rewrites**: `/api/:path*` proxied to Railway backend
- **Headers**: Security headers, cache control for hashed assets
- **CDN**: Static assets served globally via Vercel Edge Network

### Railway Deployment (Backend)

- **Trigger**: Auto-deploy on push to matching branch
- **Runtime**: Node 20, ESM modules
- **Health check**: `GET /api/health` returns `{ success: true, timestamp, uptime }`
- **Environment**: Required vars validated on startup (`JWT_SECRET`, `MONGODB_URI`)
- **Graceful shutdown**: Handles SIGTERM, drains connections (15s timeout), disconnects MongoDB

### Environment Configuration

| Variable | Production | Staging | Development |
|----------|-----------|---------|-------------|
| `NODE_ENV` | `production` | `staging` | `development` |
| `MONGODB_URI` | Atlas connection string | Railway internal | `localhost:27017` |
| `JWT_SECRET` | 32+ char random | 32+ char random | `dev-secret-change-me` |
| `CORS_ORIGIN` | (uses defaults) | (uses defaults) | (uses all) |
| `PLATFORM_URL` | `bemore-tawny.vercel.app` | `bemorecapital.co.za` | `localhost:3000` |
| `RESEND_API_KEY` | Set | Set | Optional |
| `SMTP_*` | Fallback config | Fallback config | Optional |

### Process Resilience

- **Unhandled rejections**: Logged, process continues
- **Uncaught exceptions**: Logged, process exits (Railway auto-restarts)
- **MongoDB connection**: 3 retries with exponential backoff (2s, 4s, 8s)
- **Missing required vars**: Process exits immediately in production/staging
- **Trust proxy**: Enabled for accurate IP resolution behind Railway reverse proxy
