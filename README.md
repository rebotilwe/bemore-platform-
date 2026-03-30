# BeMore — SME Access Initiative Platform

A **live engagement and data capture platform** for the BeMore SME Access Initiative, connecting South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding through PBSA.

**Summit**: 30-31 March 2026, Sandton Convention Centre
**Live URL**: https://bemorecapital.co.za

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, Vite, Vanilla SPA (no framework) |
| Backend | Node.js, Express, ESM modules |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (bcryptjs) |
| Email | Nodemailer (SMTP via mail.bts-app.co.za) |
| Testing | Jest + mongodb-memory-server (backend), Vitest (frontend) |
| Hosting | Vercel |

## Architecture

```
BeMore/
  frontend/                        Vite + TypeScript SPA
    src/
      pages/public/                Hero, Gateway, Form, Success, About,
                                   Landing (QR entry), Mentee Meter, Status
      pages/admin/                 Dashboard, Leads, Analytics, Reports,
                                   Deal Room, Audit Log, QR Generator, Login
      components/                  Nav, Toast, Modal, Confirm Dialog,
                                   Loading Button, Empty State, Error Boundary
      styles/                      Design tokens + 29 CSS modules
      types/                       Application, API, Routes
      constants/                   Categories, funders (PBSA), status, tags,
                                   form-steps, summit-config
      utils/                       Validation, formatting, CSV, auto-tag, DOM
      api.ts                       API client (live + localStorage demo mode)
      router.ts                    Hash-based SPA router with auth guards
      store.ts                     Reactive state management
      auth.ts                      JWT auth + session verification
    public/                        SW (v5), manifest, icons, sitemap, robots
    index.html                     Entry with SEO, OG, Twitter, JSON-LD

  backend/                         Node.js + Express + MongoDB
    src/
      config/                      Environment config, rate limiters (4 tiers)
      constants/                   Enums (profiles, statuses, funders)
      models/                      Application, Admin, AnalyticsEvent
      services/                    Business logic layer
        applicationService.js      CRUD, filtering, sorting, sanitisation
        authService.js             JWT authentication
        reportService.js           4 pre-built intelligence reports
        analyticsService.js        7 aggregation pipelines
      controllers/                 HTTP handlers (application, auth, analytics, report)
      middleware/                  Auth (JWT), error handler, request logger, validate
      routes/                      Express routers (applications, auth, health, analytics, reports)
      utils/                       Auto-tag engine, email templates (6), logger (Winston)
    __tests__/                     97 tests (Jest + mongodb-memory-server)
    server.js                      Entry: DB connect, admin seed, graceful shutdown
    seed.js                        Seeder (65 realistic SA applications)

  docs/
    api/openapi.yaml               OpenAPI 3.1 specification
```

## Features

### Public Portal
- **Hero page** with animated landing, PBSA branding, and CTAs
- **About Us** with 7 scrollable sections (overview, group structure, vision, empowerment, impact, metrics, opportunity)
- **Gateway** for profile selection (Developer, Landowner, Investor, Operator, Professional, Aspiring)
- **Multi-step registration** (5 steps) with validation, auto-save every 30s, profile-specific fields
- **Success page** with reference number, "What Happens Next" timeline, 3 CTA cards
- **QR Landing page** co-branded (BeMore x PBSA) with direct CTAs for summit visitors
- **Mentee Meter** page with configurable Mentimeter iframe embed for live polling
- **Status lookup** page where applicants check their application progress (ref number + email)
- **404 page** with helpful navigation
- **PWA** with service worker (v5), offline fallback, manifest, 9 icon sizes
- **Responsive** mobile-first design with hamburger nav, safe areas, 48px touch targets

### Admin Portal
- **Dashboard** with KPI cards (hover animations), conversion funnel, profile breakdown, engagement source tracking, lead classification breakdown, top tags, quick actions, recent applications
- **Leads Management** with search, filter by type/status, sortable table columns (name, type, status, date), card + table views, shortlist toggle, bulk status change, CSV export with 19 columns
- **Analytics** with conversion funnel, submission trends (day/week/month), tag distribution + co-occurrence, demographics, deal room metrics, date range selector
- **Reports** with 4 pre-built reports (High Value, Pipeline Ready, Institutional Grade, Deal Room Shortlist) with results table and export
- **Deal Room** with summary KPIs, PBSA assignment, search, summit access / deal room entry toggles
- **Audit Log** with event timeline, category filters, search, event stats bar, actor badges (Admin/Applicant/System), metadata expansion, IP tracking, pagination (50/page)
- **QR Generator** with branded QR preview, configurable source tags (qr, qr-brochure, qr-banner, qr-badge, qr-flyer), high-res download, URL copy
- **Application Detail Modal** with full form data, status change, admin notes, classification (hot/warm/cold), follow-up tracking (due date + notes), deal room controls

### Backend
- **Auto-tagging engine** with 20+ intelligence tags (HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, SHOVEL_READY, etc.)
- **Analytics system** with 7 MongoDB aggregation pipelines, event tracking on all mutations
- **Email system** with 6 templates: submission confirmation, 4 status notifications (reviewing, shortlisted, invited, funded), summit reminder. All co-branded (BeMore x PBSA) with CTA buttons
- **Source tracking** via `?src=` URL parameter, captured in `sessionStorage`, persisted on submission
- **Classification** system (hot/warm/cold/unclassified) with follow-up tracking (required, due date, notes)
- **Enhanced health check** verifying MongoDB connectivity (returns 503 if DB down)
- **Security** with JWT auth, input sanitisation, 4-tier rate limiting, CORS, Helmet, phone regex validation
- **Error handling** for Mongoose validation, cast, duplicate key, JSON parse, network, JWT expiry errors

## Getting Started

### Prerequisites
- Node.js 18+
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
cp .env.example .env  # Edit with your MongoDB URI + SMTP settings
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
# Backend (97 tests — Jest + mongodb-memory-server)
cd backend
npm test

# Frontend (42 tests — Vitest)
cd frontend
npx vitest run
```

## Environment Variables (Backend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/bemore` | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | `dev-secret-change-me` | JWT signing key (32+ chars) |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiry |
| `CORS_ORIGIN` | No | localhost:3000,5173 | Allowed origins (comma-separated, or `*`) |
| `SMTP_HOST` | No | - | SMTP host (emails disabled if empty) |
| `SMTP_PORT` | No | 587 | SMTP port (465 for SSL) |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `SMTP_FROM` | No | `noreply@bemore.co.za` | From email address |
| `SMTP_FROM_NAME` | No | `BeMore Group` | From display name |
| `ADMIN_SEED_EMAIL` | No | `admin@bemore.co.za` | Default admin email |
| `ADMIN_SEED_PASSWORD` | No | `BeMore@2026!` | Default admin password |

## API Endpoints

### Public (No auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (verifies MongoDB) |
| POST | `/api/applications` | Submit application |
| POST | `/api/applications/lookup` | Status lookup (ref number + email) |

### Admin (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login (10 req/15min) |
| GET | `/api/auth/verify` | Verify token |
| GET | `/api/applications` | List with filters, sort, pagination |
| GET | `/api/applications/stats` | Aggregate statistics (byType, byStatus, byTag, bySource, byClassification) |
| GET | `/api/applications/export/csv` | CSV export (19 columns) |
| GET | `/api/applications/:id` | Single application |
| PATCH | `/api/applications/:id` | Update: status, dealRoom, classification, followUp, adminNotes |
| POST | `/api/applications/bulk-status` | Bulk status change (max 100) |
| POST | `/api/applications/send-reminders` | Send summit reminder emails (max 100) |
| GET | `/api/reports/:name` | Pre-built report (high-value-developers, pipeline-ready-land, institutional-grade-housing, deal-room-shortlist) |

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

## Application Data Model

```
Application {
  refNumber          BM-XXXXXXXX (auto-generated, unique)
  userType           developer | landowner | investor | student | professional | aspiring
  personal           { firstName, surname, email, phone, companyName? }
  formData           Mixed (5-step form: readiness, funding, project, consent)
  tags               [] auto-generated: HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, etc.
  status             new -> reviewing -> shortlisted -> invited -> funded
  engagementSource   direct | qr | qr-brochure | qr-banner | qr-badge | qr-flyer
  classification     unclassified | hot | warm | cold
  followUp           { required, dueDate, notes, completedAt }
  dealRoom           { summitAccess, dealRoomEntry, funders: ['PBSA'] }
  adminNotes         String
  submittedAt        Date
  updatedAt          Date
}
```

## Design System

- **Theme**: Dark luxury editorial — gold (`#c9a84c`) on near-black (`#0a0a0f`)
- **Fonts**: Cormorant Garamond (display), DM Sans (body), DM Mono (data)
- **Spacing**: 4px base scale (`--sp-1` to `--sp-24`)
- **Breakpoints**: 600px (SM), 905px (MD), 1240px (LG)
- **Touch targets**: 48px minimum on mobile
- **Animations**: Reduced motion respected via `prefers-reduced-motion`
- **Partner branding**: PBSA (sole institutional funding partner)

## Email Templates

| Template | Trigger | Includes |
|----------|---------|----------|
| Submission Confirmation | User submits form | Ref number, "Check My Status" + "Join Live Poll" buttons |
| Under Review | Admin sets reviewing | 5-day timeline, status check link |
| Shortlisted | Admin sets shortlisted | PBSA partner mention, status check link |
| Summit Invitation | Admin sets invited | Full event details (date, venue, dress code) |
| Funding Confirmed | Admin sets funded | Partnership confirmed, onboarding next steps |
| Summit Reminder | Admin triggers send-reminders | Event details, check-in instructions, Live Poll link |

All emails: co-branded header (BeMore x PBSA), reference number box, gold CTA buttons, summit info card, footer.

## Deployment

Frontend and backend deployed to Vercel.

```bash
# Frontend
cd frontend && vercel --prod

# Backend
cd backend && vercel --prod
```

Set environment variables in Vercel project settings.

## POPIA Compliance

- Explicit consent captured at registration (T&Cs + POPIA checkboxes)
- Data retention: 24 months from submission date
- Deletion requests: info@bts-app.co.za (processed within 30 days)
- Consent withdrawal supported (application removed from Programme)
- PII not exposed in public API responses (status lookup returns limited fields)
- Admin notes and classification are admin-only, never exposed to applicants

## Licence

Private — BeMore Group (Pty) Ltd
