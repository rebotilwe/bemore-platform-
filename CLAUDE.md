# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last updated**: 31 Mar 2026

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
│       │   └── admin/        # login, dashboard, leads, analytics, reports, deal-room, audit-log, qr-generator, polls, guide
│       ├── components/       # nav, toast, modal, confirm-dialog, loading-button, empty-state, error-boundary, app-detail-modal
│       ├── constants/        # categories, funders (PBSA), status, tags, form-steps, summit-config
│       ├── types/            # application, api, routes
│       ├── utils/            # validation (SA phone), auto-tag, format, csv, dom
│       └── styles/           # tokens, reset, typography, base, components/*, pages/*
├── backend/                  # Express + MongoDB (Mongoose) API
│   ├── server.js             # Entry: connect DB (retry), seed admin, graceful shutdown, unhandled error handlers
│   ├── src/
│   │   ├── app.js            # Express app factory (trust proxy, compression, CORS, helmet)
│   │   ├── config/           # index.js (env validation), rateLimit.js (5 limiters), db.js (retry logic)
│   │   ├── models/           # Application, Admin, AnalyticsEvent, EmailLog, SiteSettings
│   │   ├── controllers/      # application, auth, analytics, report, poll
│   │   ├── services/         # applicationService (duplicate check), authService, analyticsService, reportService
│   │   ├── routes/           # applications (POPIA endpoints), auth, health, analytics, reports, polls, settings
│   │   ├── middleware/       # auth (JWT), errorHandler, requestLogger, validate
│   │   └── utils/            # autoTag, mailer (nodemailer + EmailLog tracking), logger (winston)
│   └── __tests__/            # Jest + mongodb-memory-server (55 tests)
└── docs/
    └── api/openapi.yaml      # OpenAPI 3.1 spec
```

## Development Commands

```bash
# Frontend (runs on http://localhost:3000, proxies /api to :5000)
cd frontend && npm install && npm run dev

# Backend (runs on http://localhost:5000)
cd backend && cp .env.example .env  # fill in MongoDB URI + SMTP
npm install && npm run dev          # nodemon auto-restart

# Tests
cd backend && npm test              # 55 Jest tests (sequential, test env)
cd frontend && npx vitest run       # 43 Vitest tests
```

## Key Architecture Patterns

### Routing (Frontend)
Hash-based SPA router (`/#/path`). Routes defined in `src/router.ts`:
- **Public**: `/`, `/gateway`, `/register`, `/about`, `/success`, `/landing`, `/mentee-meter`, `/status`
- **Admin** (auth guarded): `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/analytics`, `/admin/reports`, `/admin/deal-room`, `/admin/audit-log`, `/admin/qr`, `/admin/polls`, `/admin/guide`

### API (Backend)
- **Public**: `POST /api/applications`, `POST /api/applications/lookup`, `POST /api/applications/data-export`, `POST /api/applications/data-delete`, `GET /api/health`, `GET /api/settings/public/:key`
- **Admin** (JWT): `GET/PATCH /api/applications`, `GET /api/applications/stats`, `GET /api/applications/export/csv`, `POST /api/applications/bulk-status`, `POST /api/applications/send-reminders`, `GET /api/reports/:name`, `POST /api/auth/login`, `GET /api/auth/verify`, `GET/PUT /api/settings`, `GET /api/emails/:refNumber`
- **Analytics** (JWT): `GET /api/analytics/{dashboard,funnel,trends,tags,demographics,deal-room,events}`
- **Polls** (JWT): `GET/POST/PATCH/DELETE /api/polls`, `POST /api/polls/:id/vote`, `GET /api/polls/:id/results`

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
- `sendSummitReminder()` — admin-triggered via `POST /api/applications/send-reminders`

All emails: co-branded (BeMore x PBSA), logo header, reference number, CTA buttons, summit card. Every send logged to `EmailLog` collection with status (sent/failed).

### Source Tracking (QR)
URL param `?src=qr` captured in `sessionStorage`, attached to submissions as `engagementSource`. Admin dashboard shows source breakdown. QR generator at `/#/admin/qr`.

### Duplicate Prevention
Same email + userType combination returns 409 with existing refNumber. Frontend handles this with user-friendly message and link to status page.

### POPIA Data Rights
Public endpoints at `/api/applications/data-export` and `/api/applications/data-delete` allow applicants to export or permanently delete their data using refNumber + email. TTL index auto-deletes after 24 months.

### Site Settings
Key-value store (`SiteSettings` model) for admin-configurable values (e.g., Mentimeter embed ID). Public read at `GET /api/settings/public/:key`, admin write at `PUT /api/settings/:key`.

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

- **Frontend**: Vercel (auto-deploy from `main` branch). Config in `frontend/vercel.json`
- **Backend**: Railway (`bemore-production.up.railway.app`). API proxied via Vercel rewrites
- **Production URL**: `https://bemore-tawny.vercel.app`

## Key Dependencies

**Backend**: express, mongoose, jsonwebtoken, bcryptjs, helmet, cors, compression, express-rate-limit, express-validator, nodemailer, winston, uuid
**Frontend**: vite, typescript (vanilla TS, no framework), @vercel/analytics, @vercel/speed-insights
**Testing**: jest, mongodb-memory-server, supertest (backend); vitest (frontend)
