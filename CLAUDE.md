# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last updated**: 11 May 2026

## Sprint state

**Active sprint:** _none — last sprint completed 2026-05-11._

**Last completed sprint:** Onboarding Flow Update — All 6 Stakeholder Profiles (closed 2026-05-11)
- **Spec:** `docs/superpowers/specs/2026-05-11-onboarding-flow-update-design.md`
- **Task manifest:** `docs/superpowers/specs/2026-05-11-onboarding-flow-task-manifest.md`
- **Outcome:** All 6 profile question sets realigned to the Workstream C memorandum (4 May 2026); universal Step-5 feedback layer shipped; optional CV upload live for Built Environment Professionals (Railway volume `/app/uploads`); auto-tagging + admin views updated. No DB migration performed.
- **QA verdict:** APPROVED (after blocker #1 fix — Submit button silent-bail; QA-1..4 green).
- **Outstanding follow-ups:** DV-1 (production Railway volume) still pending; everything else closed.
- **Post-sprint cleanup (2026-05-11) included:** SMTP fully removed (Resend is the sole email provider), `pipeline-ready-land` report renamed to `pipeline-ready-developers`, two new POPIA receipt email templates (`sendDataExportReceipt`, `sendDataDeleteReceipt`), HTML escaping in `buildEmail()`, stale Professional whitelist keys (`activityLookingNow`, `whyNotLooking`) removed.

## Project Overview

BeMore is a **live engagement and data capture platform** for the BeMore SME Access Initiative. It connects South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding partnerships through PBSA. Summit event: 30-31 March 2026, Sandton Convention Centre.

## Architecture

Full-stack SPA with offline-capable demo mode.

```
BeMore/
├── frontend/                 # Vite + TypeScript SPA (vanilla, no framework)
│   ├── index.html            # Entry point with meta/SEO/PWA tags
│   ├── public/               # Static assets (SW v2, manifest, icons, sitemap, logo)
│   └── src/
│       ├── main.ts           # App init, Vercel analytics/speed-insights, SW registration
│       ├── router.ts         # Hash-based SPA router with auth guards
│       ├── api.ts            # API client with localStorage demo fallback
│       ├── store.ts          # Reactive state (get/set/subscribe)
│       ├── auth.ts           # JWT auth + session verify
│       ├── pages/
│       │   ├── public/       # hero, gateway, form (profile-aware 5-step), success, about (7 sub-routes), landing, status
│       │   └── admin/        # login, dashboard, leads, analytics, reports, deal-room, audit-log, qr-generator, traffic, guide, settings
│       ├── components/       # nav, toast, confirm-dialog, loading-button, empty-state, error-boundary, app-detail-modal
│       ├── constants/        # categories, funders (PBSA), status, tags, form-steps (getStepMeta), summit-config
│       ├── types/            # application, api, routes
│       ├── services/         # tracker (page views, events, heartbeat)
│       ├── utils/            # validation (SA phone), auto-tag, format, csv, dom, pdf-report
│       └── styles/           # tokens, reset, typography, base, components/*, pages/*
├── backend/                  # Express + MongoDB (Mongoose) API
│   ├── server.js             # Entry: connect DB (retry), seed admin, graceful shutdown, unhandled error handlers
│   ├── src/
│   │   ├── app.js            # Express app factory (trust proxy, compression, CORS, helmet)
│   │   ├── config/           # index.js (env validation), rateLimit.js (6 limiters), db.js (retry logic)
│   │   ├── models/           # Application (+ allocatedProjects), Admin, AdminAuditLog, AnalyticsEvent, EmailLog, SiteSettings, PageView, TrackingEvent
│   │   ├── controllers/      # application, auth, analytics, report, traffic
│   │   ├── services/         # applicationService (duplicate check, ALLOWED_UPDATE_FIELDS), authService, analyticsService, reportService, trafficService
│   │   ├── routes/           # applications (POPIA endpoints), auth, health, analytics, reports, settings, tracking
│   │   ├── middleware/       # auth (JWT + Bearer), csrfProtection, errorHandler, requestLogger, validate
│   │   └── utils/            # autoTag (all 6 profiles), mailer (Resend only — SMTP removed 2026-05-11), logger (winston), redactPII (POPIA)
│   └── __tests__/            # Jest + mongodb-memory-server (308 tests)
├── docs/
│   ├── api/openapi.yaml      # OpenAPI 3.1 spec (50+ endpoints)
│   ├── architecture.md       # System architecture with ASCII diagrams
│   ├── environment-setup.md  # Developer setup guide
│   ├── release-management.md # Versioning and release workflow
│   ├── adr/                  # 8 Architecture Decision Records
│   ├── compliance/popia.md   # POPIA compliance documentation
│   └── runbooks/             # deployment, incident-response, backup-recovery
├── CONTRIBUTING.md            # Developer contribution guide
└── SECURITY.md                # Security policy and vulnerability reporting
```

## Development Commands

**Requires Node 20+.** Backend uses ESM (`"type": "module"` in package.json) — use `import`/`export`, not `require`.

```bash
# Frontend (runs on http://localhost:3000, proxies /api to :5000)
cd frontend && npm install && npm run dev

# Backend (runs on http://localhost:5000)
cd backend && cp .env.example .env  # fill in MongoDB URI + RESEND_API_KEY
npm install && npm run dev          # nodemon auto-restart

# Type check (frontend only — backend is plain JS)
cd frontend && npm run typecheck    # tsc --noEmit

# Tests
cd backend && npm test              # 308 Jest tests (sequential, --runInBand, cross-env)
cd backend && npm run test:coverage # with coverage report
cd frontend && npx vitest run       # 386 Vitest tests
cd frontend && npm run test:coverage

# Run a single test file
cd backend && npx jest __tests__/auth.test.js
cd frontend && npx vitest run src/__tests__/router.test.ts

# Run tests matching a pattern
cd backend && npx jest -t "should create application"
cd frontend && npx vitest run -t "pattern"
```

## Key Architecture Patterns

### Routing (Frontend)
Hash-based SPA router (`/#/path`). Routes defined in `src/router.ts`:
- **Public**: `/`, `/gateway`, `/register`, `/about`, `/about/overview`, `/about/group`, `/about/vision`, `/about/empowerment`, `/about/impact`, `/about/performance`, `/about/opportunity`, `/success`, `/landing`, `/status`
- **Admin** (auth guarded): `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/analytics`, `/admin/traffic`, `/admin/reports`, `/admin/deal-room`, `/admin/audit-log`, `/admin/qr`, `/admin/guide`, `/admin/settings`

### API (Backend)
- **Public**: `POST /api/applications`, `POST /api/applications/lookup` (returns `allocatedProjects`), `POST /api/applications/data-export`, `POST /api/applications/data-delete`, `GET /api/health`, `GET /api/settings/public/:key`
- **Admin** (JWT): `GET/PATCH /api/applications`, `GET /api/applications/stats`, `GET /api/applications/export/csv`, `POST /api/applications/bulk-status`, `POST /api/applications/send-reminders`, `GET /api/reports/:name`, `POST /api/auth/login`, `GET /api/auth/verify`, `GET/PUT /api/settings`, `GET /api/emails/:refNumber`
- **Analytics** (JWT): `GET /api/analytics/{dashboard,funnel,trends,tags,demographics,deal-room,events}` (also aliased at `/api/insights/*`)
- **Tracking** (public, rate-limited): `POST /api/track/pageview`, `POST /api/track/event`, `POST /api/track/heartbeat`
- **Traffic** (JWT): `GET /api/insights/traffic`, `GET /api/insights/traffic/{trends,referrers,devices,hours,form-funnel,clicks}`
- **Reports** (JWT): `GET /api/reports/{high-value-developers,pipeline-ready-developers,institutional-grade-housing,deal-room-shortlist}`

### Application Data Model
```
Application {
  refNumber          BM-XXXXXXXX (auto-generated, unique)
  userType           developer | landowner | investor | student | professional | aspiring
  personal           { firstName, surname, email, phone (+27 normalized), companyName? }
  formData           Mixed — profile-specific fields per userType (see form-steps/ for schema)
  tags               [] (auto-generated by autoTag engine)
  status             new -> reviewing -> shortlisted -> invited -> funded
  engagementSource   direct | qr | qr-brochure | qr-banner | etc.
  classification     unclassified | hot | warm | cold (admin-set)
  followUp           { required, dueDate, notes, completedAt }
  dealRoom           { summitAccess, dealRoomEntry, funders: ['PBSA'] }
  adminNotes         String
  allocatedProjects  [String] — project refs assigned by admin (professionals only)
}
```

### Profile-Aware Form
The 5-step registration form branches per `userType`. Each profile has tailored fields, step labels, validation rules, and `formData` structure:
- `getStepMeta(stepIndex, profile)` in `form-steps.ts` returns profile-specific step titles and labels
- `SKIP_GENERIC` in `step-readiness.ts` — investor, professional, student skip the generic land/stage/value block
- `collectAllFormData()` in `form.ts` captures only the relevant fields per profile, deleting inapplicable generic keys before submission

### Auto-Tagging Engine
Mongoose `pre('save')` hook applies intelligence tags based on `formData`. Mirror runs client-side in `auto-tag.ts`:
- Value: `HIGH_VALUE`, `LARGE_CAPITAL`, `MID_VALUE`
- Stage: `LAND_SECURED`, `FUNDING_STAGE`, `SHOVEL_READY`
- Composite: `PIPELINE_READY`, `INSTITUTIONAL_GRADE`
- Intent: `SEEKS_EQUITY`, `SEEKS_DEBT`, `FUNDED_BEFORE`, `INSTITUTIONAL_TRACK`
- Profile-specific: `EXPERIENCED`, `STUDENT_FOCUS`, `LARGE_OPERATOR`, `HIGH_OCCUPANCY`, `UNI_ACCREDITED`, `NSFAS_ACCREDITED`, `REGISTERED`, `LARGE_SCALE`, `LARGE_INVESTOR`, `INVESTOR`

### Email System
Resend is the sole email provider as of **2026-05-11**. `nodemailer` and all SMTP code paths (`SMTP_HOST/PORT/USER/PASS`, SMTP fallback branch, `checkSmtp()` health probe) were removed. If `RESEND_API_KEY` is missing, sends are short-circuited with a logged error and the API call still succeeds (fire-and-forget). The `/api/health` `email` field reports `'ok'` when `RESEND_API_KEY` is set, otherwise `'not configured'`. Templates in `backend/src/utils/mailer.js`:
- `sendSubmissionConfirmation()` — on application submit
- `sendStatusNotification()` — on status change (reviewing, shortlisted, invited, funded)
- `sendSummitReminder()` — admin-triggered via bulk "Send Reminders" button on leads page or `POST /api/applications/send-reminders`
- `sendDataExportReceipt()` — fire-and-forget after `POST /api/applications/data-export`; confirms the export was honoured, includes timestamp + refNumber. Does NOT include the signed download URL (5-min TTL would expire before the email is read).
- `sendDataDeleteReceipt()` — fire-and-forget after `POST /api/applications/data-delete`; confirms permanent erasure, includes timestamp + refNumber, no CTA buttons (record no longer exists). Identity is captured BEFORE `findOneAndDelete` runs.

All emails: co-branded (BeMore x PBSA), logo header, reference number, CTA buttons, summit card. Every send logged to `EmailLog` collection with status (sent/failed). The shared `buildEmail()` template now defence-in-depth-escapes `firstName` and `refNumber` via an internal `escapeHtml()` helper (inputs are already sanitised at the route boundary, but the escape protects against future regressions).

### Source Tracking (QR)
URL param `?src=qr` captured in `sessionStorage`, attached to submissions as `engagementSource`. Admin dashboard shows source breakdown. QR generator at `/#/admin/qr`.

### Duplicate Prevention
Same email + userType combination returns 409 with existing refNumber. Frontend handles this with user-friendly message and link to status page.

### POPIA Data Rights
Public endpoints at `/api/applications/data-export` and `/api/applications/data-delete` allow applicants to export or permanently delete their data using refNumber + email. TTL index auto-deletes after 24 months.

### Site Settings
Key-value store (`SiteSettings` model) for admin-configurable values (e.g., summit config). Public read at `GET /api/settings/public/:key`, admin write at `PUT /api/settings/:key`. Write endpoint enforces an `ALLOWED_SETTINGS` whitelist.

### Summit Config Toggle
`summit_config` setting (JSON object with `active`, `date`, `venue`, etc.) controls summit-specific content across hero, landing, success, and form-confirm pages. Toggle via `/#/admin/settings`. When `active: false`, all summit banners, dates, and venue references are hidden.

### Site Traffic Analytics
Client-side tracker (`frontend/src/services/tracker.ts`) tracks page views, sessions, form funnel steps, and CTA clicks. Tracking is fire-and-forget using `sendBeacon`/`fetch` to `POST /api/track/*` endpoints. Data stored in `PageView` and `TrackingEvent` MongoDB collections (1-year TTL). Server-side UA parsing via `ua-parser-js`. Admin dashboard at `/#/admin/traffic` shows KPIs, trends, top pages, form funnel, traffic sources, device breakdown, hourly heatmap, and top CTAs. Public pages use `data-track` attributes on CTA elements for click tracking via delegated event listener.

### Demo Mode
Frontend auto-detects backend via `GET /api/health`. If offline, falls back to `localStorage` with full CRUD. Admin credentials are set via environment variables.

## Design System

- **Dark luxury editorial**: gold (`--gold: #c9a84c`) on near-black (`--ink: #0a0a0f`)
- **Fonts**: Cormorant Garamond (serif display), DM Sans (body), DM Mono (data)
- **Spacing**: 4px base scale (`--sp-1` to `--sp-24`)
- **Logo**: `/public/be-more-group-logo.png` — used in nav, landing, admin sidebar, login, QR preview, email header
- **Partner**: PBSA (sole institutional funding partner)
- **Categories**: developer, landowner, investor, student, professional, aspiring

## Production Hardening (applied)

- **Env validation**: App exits if `JWT_SECRET` or `MONGODB_URI` missing in production/staging
- **Auth**: Dual JWT auth — Bearer token (sessionStorage) + HttpOnly cookie fallback. Railway CDN strips Set-Cookie, so Bearer is primary path through Vercel proxy rewrites
- **CSRF**: Double-submit pattern — CSRF token in header (`X-CSRF-Token`) required for POST/PUT/PATCH/DELETE (except login)
- **Admin audit logging**: All admin actions logged to `AdminAuditLog` (login, CRUD, status changes, bulk ops) with 7-year FICA retention
- **PII redaction**: Auto-redacts email, phone, SA ID, IP addresses in logs before writing (POPIA mandatory)
- **CORS**: Explicit origin list only (no wildcard), credentials + methods + headers restricted
- **Trust proxy**: Enabled for accurate IP-based rate limiting behind Railway/Vercel proxy
- **Rate limiting**: 6 tiers — health (200/min), public (100/15min), admin (300/15min), auth (10/15min), vote (60/15min), tracking (120/min)
- **Compression**: gzip on API responses
- **MongoDB retry**: 3 attempts with exponential backoff (2s/4s/8s)
- **Structured logging**: Winston only, no console.log in production
- **Process handlers**: unhandledRejection + uncaughtException caught
- **Security headers**: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, Referrer-Policy, Permissions-Policy (via Vercel)
- **Cache headers**: Hashed assets get immutable 1-year cache
- **Service worker**: Production-only (bemore-tawny.vercel.app). On staging/dev, any existing SW is auto-unregistered
- **CSV export**: Formula injection prevention (prefixes `=+\-@` cells)
- **Settings whitelist**: Only known keys can be written via admin API
- **Error handler**: Mongoose CastError no longer leaks raw values
- **Input validation**: Classification validated in sanitizeUpdate, email max 254 chars
- **Date aggregations**: All MongoDB `$dateToString` uses `Africa/Johannesburg` timezone
- **Poll updates**: Whitelist-based field assignment (no prototype pollution)
- **Email provider**: Resend only as of 2026-05-11 (SMTP removed). Missing `RESEND_API_KEY` short-circuits sends without blocking API responses; `/api/health` reports email status as `'ok'` or `'not configured'`
- **Email template hardening**: `buildEmail()` HTML-escapes `firstName` + `refNumber` (defence-in-depth — inputs are already validator-escaped at the route boundary)

## Environment Variables (Backend)

```
# Server
PORT=5000
NODE_ENV=production                # production | staging | development

# Database
MONGODB_URI=mongodb://...          # REQUIRED in production/staging

# Auth
JWT_SECRET=<32+ char random>       # REQUIRED in production/staging
JWT_EXPIRES_IN=8h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=                       # Omit to use defaults, or comma-separated origins

# Email (Resend — sole provider; SMTP removed 2026-05-11)
RESEND_API_KEY=                    # REQUIRED in production/staging
EMAIL_FROM=onboarding@resend.dev   # Verified sender. Legacy SMTP_FROM still read as fallback.
EMAIL_FROM_NAME=BeMore             # Legacy SMTP_FROM_NAME still read as fallback.

# Platform
PLATFORM_URL=https://bemore-tawny.vercel.app

# Admin Seed
ADMIN_SEED_EMAIL=admin@bemore.co.za
ADMIN_SEED_PASSWORD=<password>
```

## Deployment

### Production
- **Frontend**: Vercel (auto-deploy from `main` branch). Config in `frontend/vercel.json`
- **Backend**: Railway (`bemore-production.up.railway.app`). API proxied via Vercel rewrites
- **Production URL**: `https://bemore-tawny.vercel.app`
- **Database**: Railway MongoDB (internal: `mongodb.railway.internal:27017/bemore`, public proxy: `shortline.proxy.rlwy.net:50435`)
- **Railway Project ID**: `73f243fd-1f42-4cc2-aa2f-094a9879eea5` (production environment)

### Staging
- **Frontend**: Vercel (auto-deploy from `staging` branch). Domain: `bemorecapital.co.za`
- **Backend**: Railway (`bemore-staging.up.railway.app`). API proxied via Vercel rewrites
- **Database**: Railway MongoDB (internal: `mongodb.railway.internal:27017/bemore_staging`, public proxy: `shortline.proxy.rlwy.net:28868`)
- **Branch**: `staging` — merge features here before promoting to `main`
- **NODE_ENV**: `staging` (env validation enforced same as production)

### Branch Strategy
- `main` → production (Vercel + Railway production)
- `staging` → staging (Vercel bemorecapital.co.za + Railway staging)
- Feature branches → PR against `staging` first, then promote to `main`

### Post-Merge Warning
**After squash-merging staging → main**, always verify `frontend/vercel.json`:
- Rewrite destination must be `bemore-production.up.railway.app` (not staging)
- CSP `connect-src` must reference `bemore-production.up.railway.app`
The staging branch has different URLs that will overwrite production on merge.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on PR/push to `main`, `develop`, or `staging`:
1. **Backend Test** — `npm ci` + `npm test` (Node 20, ubuntu, coverage artifact uploaded)
2. **Frontend Test** — `tsc --noEmit` + `vitest run` + `npm run build`
3. **Security Scan** — `npm audit --audit-level=critical` on both (non-blocking, `continue-on-error`)

## Key Dependencies

**Backend**: express, mongoose, jsonwebtoken, bcryptjs, helmet, cors, compression, cookie-parser, express-rate-limit, express-validator, resend, winston, uuid
**Frontend**: vite, typescript (vanilla TS, no framework), @vercel/analytics, @vercel/speed-insights
**Testing**: jest, cross-env, mongodb-memory-server, supertest (backend); vitest, jsdom, @testing-library/dom (frontend)

## Enterprise Documentation

| Document | Path |
|----------|------|
| System Architecture | `docs/architecture.md` |
| ADRs (8 records) | `docs/adr/` |
| OpenAPI 3.1 Spec | `docs/api/openapi.yaml` |
| POPIA Compliance | `docs/compliance/popia.md` |
| Deployment Runbook | `docs/runbooks/deployment.md` |
| Incident Response | `docs/runbooks/incident-response.md` |
| Backup & Recovery | `docs/runbooks/backup-recovery.md` |
| Environment Setup | `docs/environment-setup.md` |
| Release Management | `docs/release-management.md` |
| Contributing Guide | `CONTRIBUTING.md` |
| Security Policy | `SECURITY.md` |
| PR Template | `.github/PULL_REQUEST_TEMPLATE.md` |
