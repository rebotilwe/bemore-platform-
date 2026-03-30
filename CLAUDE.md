# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last updated**: 28 Mar 2026

## Project Overview

BeMore is a **live engagement and data capture platform** (not just a landing page) for the BeMore SME Access Initiative. It connects South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding partnerships through PBSA. Summit event: 30-31 March 2026, Sandton Convention Centre.

## Architecture

Full-stack SPA with offline-capable demo mode.

```
BeMore/
├── frontend/                 # Vite + TypeScript SPA (vanilla, no framework)
│   ├── index.html            # Entry point with meta/SEO/PWA tags
│   ├── public/               # Static assets (SW, manifest, icons, sitemap)
│   └── src/
│       ├── main.ts           # App init, backend check, source capture, SW registration
│       ├── router.ts         # Hash-based SPA router with auth guards
│       ├── api.ts            # API client with localStorage demo fallback
│       ├── store.ts          # Reactive state (get/set/subscribe)
│       ├── auth.ts           # JWT auth + session verify
│       ├── pages/
│       │   ├── public/       # hero, gateway, form, success, about, landing, mentee-meter, status
│       │   └── admin/        # login, dashboard, leads, analytics, reports, deal-room, audit-log, qr-generator
│       ├── components/       # nav, toast, modal, confirm-dialog, loading-button, empty-state, error-boundary
│       ├── constants/        # categories, funders (PBSA), status, tags, form-steps, summit-config
│       ├── types/            # application, api, routes
│       ├── utils/            # validation, auto-tag, format, csv, dom
│       └── styles/           # tokens, reset, typography, base, components/*, pages/*
├── backend/                  # Express + MongoDB (Mongoose) API
│   ├── server.js             # Entry: connect DB, seed admin, graceful shutdown
│   ├── src/
│   │   ├── app.js            # Express app factory (middleware stack)
│   │   ├── config/           # index.js (env), rateLimit.js (4 limiters)
│   │   ├── models/           # Application, Admin, AnalyticsEvent
│   │   ├── controllers/      # application, auth, analytics, report
│   │   ├── services/         # applicationService, authService, analyticsService, reportService
│   │   ├── routes/           # applications, auth, health, analytics, reports
│   │   ├── middleware/       # auth (JWT), errorHandler, requestLogger, validate
│   │   └── utils/            # autoTag, mailer (nodemailer), logger (winston)
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
cd frontend && npx vitest run       # 42 Vitest tests
```

## Key Architecture Patterns

### Routing (Frontend)
Hash-based SPA router (`/#/path`). Routes defined in `src/router.ts`:
- **Public**: `/`, `/gateway`, `/register`, `/about`, `/success`, `/landing`, `/mentee-meter`, `/status`
- **Admin** (auth guarded): `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/analytics`, `/admin/reports`, `/admin/deal-room`, `/admin/audit-log`, `/admin/qr`

### API (Backend)
- **Public**: `POST /api/applications`, `POST /api/applications/lookup`, `GET /api/health`
- **Admin** (JWT): `GET/PATCH /api/applications`, `GET /api/applications/stats`, `GET /api/applications/export/csv`, `POST /api/applications/bulk-status`, `POST /api/applications/send-reminders`, `GET /api/reports/:name`, `POST /api/auth/login`, `GET /api/auth/verify`
- **Analytics** (JWT): `GET /api/analytics/{dashboard,funnel,trends,tags,demographics,deal-room,events}`

### Application Data Model
```
Application {
  refNumber       BM-XXXXXXXX (auto-generated, unique)
  userType        developer | landowner | investor | student | professional | aspiring
  personal        { firstName, surname, email, phone, companyName? }
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

All emails include co-branding (BeMore x PBSA), reference number, CTA buttons, summit card.

### Source Tracking (QR)
URL param `?src=qr` captured in `sessionStorage`, attached to submissions as `engagementSource`. Admin dashboard shows source breakdown. QR generator at `/#/admin/qr`.

### Demo Mode
Frontend auto-detects backend via `GET /api/health`. If offline, falls back to `localStorage` with full CRUD. Admin credentials are set via environment variables.

## Design System

- **Dark luxury editorial**: gold (`--gold: #c9a84c`) on near-black (`--ink: #0a0a0f`)
- **Fonts**: Cormorant Garamond (serif display), DM Sans (body), DM Mono (data)
- **Spacing**: 4px base scale (`--sp-1` to `--sp-24`)
- **Partner**: PBSA (sole institutional funding partner)
- **Categories**: developer, landowner, investor, student, professional, aspiring

## Environment Variables (Backend)

```
PORT=5000
MONGODB_URI=mongodb://...
JWT_SECRET=<32+ char random>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=*
SMTP_HOST=mail.bts-app.co.za
SMTP_PORT=465
SMTP_USER=info@bts-app.co.za
SMTP_PASS=<password>
SMTP_FROM=info@bts-app.co.za
SMTP_FROM_NAME=BeMore
ADMIN_SEED_EMAIL=admin@bemore.co.za
ADMIN_SEED_PASSWORD=<password>
```

## Deployment

Frontend + Backend deployed to Vercel. Production URL: `https://bemore-tawny.vercel.app`

## Key Dependencies

**Backend**: express, mongoose, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, express-validator, nodemailer, winston, uuid
**Frontend**: vite, typescript (vanilla TS, no framework)
**Testing**: jest, mongodb-memory-server, supertest (backend); vitest (frontend)
