# BeMore — SME Access Initiative Platform

A **live engagement and data capture platform** for the BeMore SME Access Initiative, connecting South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding through PBSA.

**Summit**: 30-31 March 2026, Sandton Convention Centre
**Live URL**: https://bemore-tawny.vercel.app
**API**: https://bemore-production.up.railway.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, Vite, Vanilla SPA (no framework) |
| Backend | Node.js, Express, ESM modules |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (bcryptjs) |
| Email | Resend (sole provider — SMTP removed 2026-05-11) |
| Monitoring | Vercel Analytics + Speed Insights, Winston structured logging |
| Testing | Jest + mongodb-memory-server (backend, 311 tests), Vitest (frontend, 386 tests) |
| Hosting | Vercel (frontend) + Railway (backend) |

## Architecture

```
BeMore/
  frontend/                        Vite + TypeScript SPA
    src/
      pages/public/                Hero, Gateway, Form (5-step), Success, About,
                                   Landing (QR entry), Mentee Meter, Status
      pages/admin/                 Dashboard, Leads, Analytics, Reports, Deal Room,
                                   Audit Log, QR Generator, Polls, Guide, Login
      components/                  Nav, Toast, Confirm Dialog, Loading Button,
                                   Empty State, Error Boundary, App Detail Modal, Poll Results Chart
      styles/                      Design tokens + 29 CSS modules
      types/                       Application, API, Routes
      constants/                   Categories, funders (PBSA), status, tags,
                                   form-steps, summit-config (centralized)
      utils/                       Validation (SA phone), formatting, CSV, auto-tag, DOM, PDF report
      services/                    poll-sse (Server-Sent Events client)
      api.ts                       API client (live + localStorage demo mode)
      router.ts                    Hash-based SPA router with auth guards
      store.ts                     Reactive state management
      auth.ts                      JWT auth + session verification
    public/                        SW (v2), manifest, icons, sitemap, robots, logo
    index.html                     Entry with SEO, OG, Twitter, JSON-LD

  backend/                         Node.js + Express + MongoDB
    src/
      config/                      Environment config (with validation), rate limiters (5 tiers), DB (retry)
      constants/                   Enums (profiles, statuses, funders)
      models/                      Application, Admin, AnalyticsEvent, EmailLog, Poll, PollResponse, SiteSettings
      services/                    Business logic layer
        applicationService.js      CRUD, filtering, sorting, sanitisation, duplicate prevention
        authService.js             JWT authentication
        reportService.js           4 pre-built intelligence reports
        analyticsService.js        7 aggregation pipelines + event tracking
      controllers/                 HTTP handlers (application, auth, analytics, report, poll)
      middleware/                   Auth (JWT), error handler, request logger, validate
      routes/                      Express routers (applications, auth, health, analytics, reports, polls, settings)
      utils/                       Auto-tag engine, email templates (6) + delivery tracking, logger (Winston)
    __tests__/                     311 tests (Jest + mongodb-memory-server)
    server.js                      Entry: DB connect (retry), admin seed, graceful shutdown, process error handlers
    seed.js                        Seeder (65 realistic SA applications)

  docs/
    api/openapi.yaml               OpenAPI 3.1 specification
    TDS.md                         Technical Design Specification
    PROJECT-SUMMARY.md             Project summary and status
```

## Features

### Public Portal
- **Hero page** with animated landing, BeMore logo, PBSA branding, and CTAs
- **About Us** with 7 scrollable sections (overview, group structure, vision, empowerment, impact, metrics, opportunity)
- **Gateway** for profile selection (Developer, Landowner, Investor, Operator, Professional, Aspiring)
- **Multi-step registration** (5 steps) with SA phone validation, auto-save every 30s, profile-specific fields, duplicate prevention (409)
- **Success page** with reference number, "What Happens Next" timeline, 3 CTA cards
- **QR Landing page** co-branded (BeMore x PBSA) with direct CTAs for summit visitors
- **Mentee Meter** page with admin-configurable Mentimeter iframe embed for live polling
- **Status lookup** page with application progress tracker + POPIA data rights (export/delete)
- **404 page** with helpful navigation
- **PWA** with service worker (v2), offline fallback, manifest, 12 icon sizes + favicon
- **Responsive** mobile-first design with hamburger nav, safe areas, 48px touch targets

### Admin Portal
- **Dashboard** with KPI cards (hover animations), conversion funnel, profile breakdown, engagement source tracking, lead classification breakdown, top tags, quick actions, recent applications
- **Leads Management** with search, filter by type/status, sortable table columns (name, type, status, date), card + table views, shortlist toggle, bulk status change, bulk send summit reminders, CSV export with 16 columns
- **Analytics** with conversion funnel, submission trends (day/week/month), tag distribution + co-occurrence, demographics, deal room metrics, date range selector
- **Reports** with 4 pre-built intelligence reports (High Value, Pipeline Ready, Institutional Grade, Deal Room Shortlist) with results table, PDF export (print-ready), and CSV export
- **Deal Room** with summary KPIs, PBSA assignment, search, summit access / deal room entry toggles
- **Audit Log** with event timeline, category filters, search, event stats bar, actor badges (Admin/Applicant/System), metadata expansion, IP tracking, pagination (50/page)
- **QR Generator** with branded QR preview, configurable source tags (qr, qr-brochure, qr-banner, qr-badge, qr-flyer), high-res download, URL copy
- **Polls** with built-in live polling system (multiple-choice, rating, word-cloud, open-text), real-time SSE updates, admin control panel (activate/pause/close), detailed results with charts, Mentimeter integration fallback
- **Settings** page for summit config toggle, Mentimeter embed ID, and platform-wide settings
- **Admin Guide** with comprehensive documentation for all features
- **Application Detail Modal** with full form data, status change, admin notes, classification (hot/warm/cold), follow-up tracking (due date + notes), deal room controls

### Backend
- **Auto-tagging engine** with 20+ intelligence tags (HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, SHOVEL_READY, etc.)
- **Duplicate prevention** — same email + userType returns 409 with existing refNumber
- **Analytics system** with 7 MongoDB aggregation pipelines, event tracking on all mutations
- **Email system** with 8 templates: submission confirmation, 4 status notifications (reviewing, shortlisted, invited, funded), summit reminder, and 2 POPIA receipts (data export, data delete). All co-branded with logo header. Every send logged to `EmailLog` collection
- **Source tracking** via `?src=` URL parameter, captured in `sessionStorage`, persisted on submission
- **Classification** system (hot/warm/cold/unclassified) with follow-up tracking (required, due date, notes)
- **Site Settings** — key-value store for admin-configurable values (Mentimeter ID, summit config, etc.) with write whitelist
- **Summit config toggle** — `summit_config` setting controls all summit-specific content (banners, dates, venue) across public pages. Togglable via admin settings
- **POPIA compliance** — data export + deletion endpoints, 24-month TTL auto-delete, consent capture
- **Enhanced health check** verifying MongoDB connectivity + Resend config presence (returns 503 if DB down). Email field reports `'ok'` or `'not configured'`; no provider network probe is performed (SMTP probe removed 2026-05-11)
- **Security** — JWT auth, input sanitisation, 5-tier rate limiting, CORS (explicit origins), Helmet, trust proxy, compression, SA phone regex validation
- **Reliability** — MongoDB connection retry (3 attempts, exponential backoff), unhandledRejection/uncaughtException handlers, graceful shutdown with connection drain
- **Monitoring** — Vercel Analytics + Speed Insights (frontend), Winston structured JSON logging (backend), email delivery tracking

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Works in **demo mode** (localStorage) without a backend. Auto-detects backend via `GET /api/health`.

### Backend

```bash
cd backend
cp .env.example .env  # Edit with your MongoDB URI + RESEND_API_KEY
npm install
npm run dev           # http://localhost:5000 (nodemon)
```

### Seed Data

```bash
cd backend
node seed.js          # Creates 65 realistic SA applications
node seed.js --force  # Clear + re-seed
```

### Run Tests

```bash
# Backend (311 tests — Jest + mongodb-memory-server)
cd backend
npm test

# Frontend (386 tests — Vitest)
cd frontend
npx vitest run
```

## Environment Variables (Backend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `MONGODB_URI` | **Yes** (prod) | `mongodb://localhost:27017/bemore` | MongoDB connection string |
| `JWT_SECRET` | **Yes** (prod) | dev fallback | JWT signing key (32+ chars) |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiry |
| `CORS_ORIGIN` | No | Production origins | Comma-separated origins (omit for defaults) |
| `PLATFORM_URL` | No | `https://bemore-tawny.vercel.app` | Platform URL for email links |
| `RESEND_API_KEY` | **Yes** (prod/staging) | — | Resend API key (sole email provider as of 2026-05-11). Sends are no-ops when missing |
| `EMAIL_FROM` | No | `onboarding@resend.dev` | From email address (use a verified Resend domain in production) |
| `EMAIL_FROM_NAME` | No | `BeMore` | From display name |
| `ADMIN_SEED_EMAIL` | No | `admin@bemore.co.za` | Default admin email |
| `ADMIN_SEED_PASSWORD` | **Yes** | — | Admin password (set in env) |

## API Endpoints

### Public (No auth, rate-limited)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (MongoDB + Resend config) |
| POST | `/api/applications` | Submit application (duplicate check) |
| POST | `/api/applications/lookup` | Status lookup (ref number + email) |
| POST | `/api/applications/data-export` | POPIA: export applicant data as JSON |
| POST | `/api/applications/data-delete` | POPIA: permanently delete applicant data |
| GET | `/api/settings/public/:key` | Read a public site setting |

### Admin (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login (10 req/15min) |
| GET | `/api/auth/verify` | Verify token |
| GET | `/api/applications` | List with filters, sort, pagination |
| GET | `/api/applications/stats` | Aggregate statistics |
| GET | `/api/applications/export/csv` | CSV export (19 columns) |
| GET | `/api/applications/:id` | Single application |
| PATCH | `/api/applications/:id` | Update: status, dealRoom, classification, followUp, adminNotes |
| POST | `/api/applications/bulk-status` | Bulk status change (max 100) |
| POST | `/api/applications/send-reminders` | Send summit reminder emails (max 100) |
| GET | `/api/reports/:name` | Pre-built report |
| GET | `/api/emails/:refNumber` | Email delivery history for an application |
| GET | `/api/settings` | Get all site settings |
| PUT | `/api/settings/:key` | Update a site setting |

### Analytics (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | KPI dashboard (7d/30d/90d/1y) |
| GET | `/api/analytics/funnel` | Conversion funnel |
| GET | `/api/analytics/trends` | Submission trends (day/week/month) |
| GET | `/api/analytics/tags` | Tag distribution + co-occurrence |
| GET | `/api/analytics/demographics` | Demographics breakdown |
| GET | `/api/analytics/deal-room` | Deal room analytics |
| GET | `/api/analytics/events` | Audit event log (paginated, filterable) |

### Polls (JWT required for management, public for voting)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/polls` | List polls |
| POST | `/api/polls` | Create poll |
| PATCH | `/api/polls/:id` | Update poll |
| DELETE | `/api/polls/:id` | Delete poll |
| GET | `/api/polls/active` | Get active poll + question (public) |
| POST | `/api/polls/:id/vote` | Submit vote (public, deduplicated) |
| GET | `/api/polls/:id/live` | SSE stream for live results (public) |
| PATCH | `/api/polls/:id/status` | Set poll status (draft/active/paused/closed) |
| PATCH | `/api/polls/:id/activate` | Set active question index |
| GET | `/api/polls/:id/results` | Detailed poll results |

## Application Data Model

```
Application {
  refNumber          BM-XXXXXXXX (auto-generated, unique)
  userType           developer | landowner | investor | student | professional | aspiring
  personal           { firstName, surname, email, phone (+27 normalized), companyName? }
  formData           Mixed (5-step form: readiness, funding, project, consent)
  tags               [] auto-generated: HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, etc.
  status             new -> reviewing -> shortlisted -> invited -> funded
  engagementSource   direct | qr | qr-brochure | qr-banner | qr-badge | qr-flyer
  classification     unclassified | hot | warm | cold
  followUp           { required, dueDate, notes, completedAt }
  dealRoom           { summitAccess, dealRoomEntry, funders: ['PBSA'] }
  adminNotes         String
  submittedAt        Date (TTL: 24 months — POPIA)
  updatedAt          Date
}
```

## Design System

- **Theme**: Dark luxury editorial — gold (`#c9a84c`) on near-black (`#0a0a0f`)
- **Logo**: BeMore Group logo (orange/gold "B" mark with "Be More" text)
- **Fonts**: Cormorant Garamond (display), DM Sans (body), DM Mono (data)
- **Spacing**: 4px base scale (`--sp-1` to `--sp-24`)
- **Breakpoints**: 600px (SM), 905px (MD), 1240px (LG)
- **Touch targets**: 48px minimum on mobile
- **Animations**: Reduced motion respected via `prefers-reduced-motion`
- **Partner branding**: PBSA (sole institutional funding partner)

## Email Templates

| Template | Trigger | Includes |
|----------|---------|----------|
| Submission Confirmation | User submits form | Logo, ref number, "Check My Status" + "Join Live Poll" buttons |
| Under Review | Admin sets reviewing | 5-day timeline, status check link |
| Shortlisted | Admin sets shortlisted | PBSA partner mention, status check link |
| Summit Invitation | Admin sets invited | Full event details (date, venue, dress code) |
| Funding Confirmed | Admin sets funded | Partnership confirmed, onboarding next steps |
| Summit Reminder | Admin triggers send-reminders | Event details, check-in instructions, Live Poll link |

All emails: logo header, co-branded bar (BeMore x PBSA), reference number box, gold CTA buttons, summit info card, footer. Every send tracked in `EmailLog` collection.

## Security & Production Hardening

- **Env validation**: App exits if `JWT_SECRET` or `MONGODB_URI` missing in production
- **CORS**: Explicit origin allowlist — `bemore-tawny.vercel.app` + `bemorecapital.co.za` (no wildcard)
- **Trust proxy**: Enabled for accurate IP rate limiting behind Railway/Vercel proxy
- **Rate limiting**: 5 tiers — health (200/min), public (100/15min), admin (300/15min), auth (10/15min), vote (60/15min)
- **Compression**: gzip on all API responses
- **Security headers**: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo disabled)
- **Cache headers**: Hashed `/assets/*` get immutable 1-year cache, icons get 24h cache
- **MongoDB retry**: 3 attempts with exponential backoff (2s/4s/8s)
- **Graceful shutdown**: SIGTERM/SIGINT drain in-flight requests (15s timeout), disconnect MongoDB
- **Process handlers**: unhandledRejection logged, uncaughtException triggers shutdown
- **Structured logging**: Winston JSON only — no console.log in production paths
- **CSV formula injection**: Both backend and frontend CSV exports prefix `=+\-@` cells
- **Settings whitelist**: Admin PUT `/settings/:key` enforces allowed keys
- **Poll prototype pollution**: Whitelist-based field assignment on poll updates
- **Date aggregations**: MongoDB `$dateToString` uses `Africa/Johannesburg` timezone
- **Input validation**: Classification validated in sanitizeUpdate, email max 254 chars, CastError values not leaked

## POPIA Compliance

- Explicit consent captured at registration (T&Cs + POPIA checkboxes)
- Data retention: 24 months from submission date (MongoDB TTL index)
- **Self-service data export**: `POST /api/applications/data-export` (refNumber + email → JSON download)
- **Self-service data deletion**: `POST /api/applications/data-delete` (refNumber + email + confirm → permanent delete)
- PII not exposed in public API responses (status lookup returns limited fields)
- Admin notes and classification are admin-only, never exposed to applicants
- All data rights actions logged to audit trail

## Deployment

- **Frontend**: Vercel (auto-deploy from `main` branch). Config: `frontend/vercel.json`
- **Backend**: Railway (`bemore-production.up.railway.app`). API proxied via Vercel rewrites at `/api/*`
- **Domain**: `bemore-tawny.vercel.app` (primary), `bemorecapital.co.za` (alias)

## Licence

Private — BeMore Group (Pty) Ltd
