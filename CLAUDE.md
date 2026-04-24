# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last updated**: 15 Apr 2026

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
│       │   ├── public/       # hero, gateway, form, success, about, landing, mentee-meter, status
│       │   └── admin/        # login, dashboard, leads, analytics, reports, deal-room, audit-log, qr-generator, polls, guide, settings
│       ├── components/       # nav, toast, confirm-dialog, loading-button, empty-state, error-boundary, app-detail-modal, poll-results-chart
│       ├── constants/        # categories, funders (PBSA), status, tags, form-steps, summit-config
│       ├── types/            # application, api, routes
│       ├── services/         # poll-sse (Server-Sent Events client)
│       ├── utils/            # validation (SA phone), auto-tag, format, csv, dom, pdf-report
│       └── styles/           # tokens, reset, typography, base, components/*, pages/*
├── backend/                  # Express + MongoDB (Mongoose) API
│   ├── server.js             # Entry: connect DB (retry), seed admin, graceful shutdown, unhandled error handlers
│   ├── src/
│   │   ├── app.js            # Express app factory (trust proxy, compression, CORS, helmet)
│   │   ├── config/           # index.js (env validation), rateLimit.js (6 limiters), db.js (retry logic)
│   │   ├── models/           # Application, Admin, AnalyticsEvent, EmailLog, Poll, PollResponse, SiteSettings, PageView, TrackingEvent
│   │   ├── controllers/      # application, auth, analytics, report, poll, traffic
│   │   ├── services/         # applicationService (duplicate check), authService, analyticsService, reportService, pollService, pollSSE, trafficService
│   │   ├── routes/           # applications (POPIA endpoints), auth, health, analytics, reports, polls, settings, tracking
│   │   ├── middleware/       # auth (JWT), errorHandler, requestLogger, validate
│   │   └── utils/            # autoTag, mailer (nodemailer + EmailLog tracking), logger (winston)
│   └── __tests__/            # Jest + mongodb-memory-server (71 tests)
└── docs/
    └── api/openapi.yaml      # OpenAPI 3.1 spec
```

## Development Commands

**Requires Node 20+.** Backend uses ESM (`"type": "module"` in package.json) — use `import`/`export`, not `require`.

```bash
# Frontend (runs on http://localhost:3000, proxies /api to :5000)
cd frontend && npm install && npm run dev

# Backend (runs on http://localhost:5000)
cd backend && cp .env.example .env  # fill in MongoDB URI + SMTP
npm install && npm run dev          # nodemon auto-restart

# Type check (frontend only — backend is plain JS)
cd frontend && npm run typecheck    # tsc --noEmit

# Tests
cd backend && npm test              # 71 Jest tests (sequential, --runInBand, 30s timeout)
cd backend && npm run test:coverage # with coverage report
cd frontend && npx vitest run       # 43 Vitest tests
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
- **Public**: `/`, `/gateway`, `/register`, `/about`, `/success`, `/landing`, `/mentee-meter`, `/status`
- **Admin** (auth guarded): `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/analytics`, `/admin/traffic`, `/admin/reports`, `/admin/deal-room`, `/admin/audit-log`, `/admin/qr`, `/admin/polls`, `/admin/guide`, `/admin/settings`

### API (Backend)
- **Public**: `POST /api/applications`, `POST /api/applications/lookup`, `POST /api/applications/data-export`, `POST /api/applications/data-delete`, `GET /api/health`, `GET /api/settings/public/:key`
- **Admin** (JWT): `GET/PATCH /api/applications`, `GET /api/applications/stats`, `GET /api/applications/export/csv`, `POST /api/applications/bulk-status`, `POST /api/applications/send-reminders`, `GET /api/reports/:name`, `POST /api/auth/login`, `GET /api/auth/verify`, `GET/PUT /api/settings`, `GET /api/emails/:refNumber`
- **Analytics** (JWT): `GET /api/analytics/{dashboard,funnel,trends,tags,demographics,deal-room,events}` (also aliased at `/api/insights/*`)
- **Polls** (mixed): `GET /api/polls/active` (public), `POST /api/polls/:id/vote` (public), `GET /api/polls/:id/live` (SSE, public), `GET/POST/PATCH/DELETE /api/polls` (JWT), `PATCH /api/polls/:id/status` (JWT), `PATCH /api/polls/:id/activate` (JWT), `GET /api/polls/:id/results` (JWT)
- **Tracking** (public, rate-limited): `POST /api/track/pageview`, `POST /api/track/event`, `POST /api/track/heartbeat`
- **Traffic** (JWT): `GET /api/insights/traffic`, `GET /api/insights/traffic/{trends,referrers,devices,hours,form-funnel,clicks}`
- **Reports** (JWT): `GET /api/reports/{high-value-developers,pipeline-ready-land,institutional-grade-housing,deal-room-shortlist}`

### Application Data Model
```
Application {
  refNumber       BM-XXXXXXXX (auto-generated, unique)
  userType        developer | landowner | investor | student | professional | aspiring
  personal        { firstName, surname, email, phone (+27 normalized), companyName? }
  formData        Mixed (5-step form data: readiness, funding, project, consent)
  tags            [] (auto-generated: HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, etc.)
  status          new -> reviewing -> shortlisted -> invited -> funded
  engagementSource  direct | qr | qr-brochure | qr-banner | etc.
  classification    unclassified | hot | warm | cold (admin-set)
  followUp        { required, dueDate, notes, completedAt }
  dealRoom        { summitAccess, dealRoomEntry, funders: ['PBSA'] }
  adminNotes      String
}
```

### Auto-Tagging Engine
Mongoose `pre('save')` hook applies intelligence tags based on `formData`:
- Value: `HIGH_VALUE`, `LARGE_CAPITAL`, `MID_VALUE`
- Stage: `LAND_SECURED`, `FUNDING_STAGE`, `SHOVEL_READY`
- Composite: `PIPELINE_READY`, `INSTITUTIONAL_GRADE`
- Profile-specific: `EXPERIENCED`, `STUDENT_FOCUS`, `LARGE_OPERATOR`, `REGISTERED`, etc.

### Email System
Nodemailer via SMTP (`mail.bts-app.co.za:465`). Templates in `backend/src/utils/mailer.js`:
- `sendSubmissionConfirmation()` — on application submit
- `sendStatusNotification()` — on status change (reviewing, shortlisted, invited, funded)
- `sendSummitReminder()` — admin-triggered via bulk "Send Reminders" button on leads page or `POST /api/applications/send-reminders`

All emails: co-branded (BeMore x PBSA), logo header, reference number, CTA buttons, summit card. Every send logged to `EmailLog` collection with status (sent/failed).

### Source Tracking (QR)
URL param `?src=qr` captured in `sessionStorage`, attached to submissions as `engagementSource`. Admin dashboard shows source breakdown. QR generator at `/#/admin/qr`.

### Duplicate Prevention
Same email + userType combination returns 409 with existing refNumber. Frontend handles this with user-friendly message and link to status page.

### POPIA Data Rights
Public endpoints at `/api/applications/data-export` and `/api/applications/data-delete` allow applicants to export or permanently delete their data using refNumber + email. TTL index auto-deletes after 24 months.

### Site Settings
Key-value store (`SiteSettings` model) for admin-configurable values (e.g., Mentimeter embed ID, summit config). Public read at `GET /api/settings/public/:key`, admin write at `PUT /api/settings/:key`. Write endpoint enforces an `ALLOWED_SETTINGS` whitelist.

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

- **Env validation**: App exits if `JWT_SECRET` or `MONGODB_URI` missing in production
- **CORS**: Explicit origin list only (no wildcard), credentials + methods + headers restricted
- **Trust proxy**: Enabled for accurate IP-based rate limiting behind Railway/Vercel proxy
- **Rate limiting**: 5 tiers — health (200/min), public (100/15min), admin (300/15min), auth (10/15min), vote (60/15min)
- **Compression**: gzip on API responses
- **MongoDB retry**: 3 attempts with exponential backoff (2s/4s/8s)
- **Structured logging**: Winston only, no console.log in production
- **Process handlers**: unhandledRejection + uncaughtException caught
- **Security headers**: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (via Vercel)
- **Cache headers**: Hashed assets get immutable 1-year cache
- **Service worker**: v2 with stale-while-revalidate, precaches logo + icons
- **CSV export**: Formula injection prevention (prefixes `=+\-@` cells)
- **Settings whitelist**: Only known keys can be written via admin API
- **Error handler**: Mongoose CastError no longer leaks raw values
- **Input validation**: Classification validated in sanitizeUpdate, email max 254 chars
- **Date aggregations**: All MongoDB `$dateToString` uses `Africa/Johannesburg` timezone
- **Poll updates**: Whitelist-based field assignment (no prototype pollution)

## Environment Variables (Backend)

```
PORT=5000
MONGODB_URI=mongodb://...          # REQUIRED in production
JWT_SECRET=<32+ char random>       # REQUIRED in production
JWT_EXPIRES_IN=8h
CORS_ORIGIN=                       # Omit to use defaults, or comma-separated origins
SMTP_HOST=mail.bts-app.co.za
SMTP_PORT=465
SMTP_USER=info@bts-app.co.za
SMTP_PASS=<password>
SMTP_FROM=info@bts-app.co.za
SMTP_FROM_NAME=BeMore
PLATFORM_URL=https://bemore-tawny.vercel.app
ADMIN_SEED_EMAIL=admin@bemore.co.za
ADMIN_SEED_PASSWORD=<password>
```

## Deployment

### Production
- **Frontend**: Vercel (auto-deploy from `main` branch). Config in `frontend/vercel.json`
- **Backend**: Railway (`bemore-production.up.railway.app`). API proxied via Vercel rewrites
- **Production URL**: `https://bemore-tawny.vercel.app`
- **Database**: MongoDB Atlas

### Staging
- **Frontend**: Vercel (auto-deploy from `staging` branch). Domain: `bemorecapital.co.za`
- **Backend**: Railway (`bemore-staging.up.railway.app`). API proxied via Vercel rewrites
- **Database**: Railway MongoDB (internal: `mongodb.railway.internal:27017/bemore_staging`)
- **Branch**: `staging` — merge features here before promoting to `main`
- **NODE_ENV**: `staging` (env validation enforced same as production)

### Branch Strategy
- `main` → production (Vercel + Railway production)
- `staging` → staging (Vercel bemorecapital.co.za + Railway staging)
- Feature branches → PR against `staging` first, then promote to `main`

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on PR/push to `main`, `develop`, or `staging`:
1. **Backend Test** — `npm ci` + `npm test` (Node 20, ubuntu, coverage artifact uploaded)
2. **Frontend Test** — `tsc --noEmit` + `vitest run` + `npm run build`
3. **Security Scan** — `npm audit --audit-level=critical` on both (non-blocking, `continue-on-error`)

## Key Dependencies

**Backend**: express, mongoose, jsonwebtoken, bcryptjs, helmet, cors, compression, express-rate-limit, express-validator, nodemailer, winston, uuid
**Frontend**: vite, typescript (vanilla TS, no framework), @vercel/analytics, @vercel/speed-insights
**Testing**: jest, mongodb-memory-server, supertest (backend); vitest, jsdom, @testing-library/dom (frontend)
