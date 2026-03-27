# BeMore — SME Access Initiative Portal

Lead-generation and deal management platform for the BeMore SME Access Initiative, targeting South African property developers, landowners, student accommodation operators, and built environment professionals seeking institutional funding partnerships (DBSA, NHFC, NEF, SAIF).

**Summit Event**: 30–31 March 2026, Sandton Convention Centre

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, Vite, Vanilla SPA |
| Backend | Node.js, Express, ESM modules |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (bcryptjs) |
| Email | Nodemailer |
| Hosting | Vercel (frontend), Railway (backend) |

## Architecture

```
BeMore/
  frontend/                     Vite + TypeScript SPA
    src/
      pages/public/             Hero, Gateway, Form, Success, About
      pages/admin/              Dashboard, Leads, Analytics, Reports,
                                Deal Room, Audit Log, Login
      components/               Nav, Toast, App Detail Modal
      styles/                   Design tokens + component CSS
      types/                    TypeScript interfaces
      constants/                Categories, statuses, funders, tags
      utils/                    Validation, formatting, CSV, auto-tag
      api.ts                    API client (auto-detects backend)
      router.ts                 Hash-based SPA router
      store.ts                  Reactive state management
      auth.ts                   JWT auth + session verify
    index.html
    vite.config.ts

  backend/                      Node.js + Express + MongoDB
    src/
      config/                   Environment config, DB connection
      constants/                Shared enum arrays
      models/                   Application, Admin, AnalyticsEvent
      services/                 Business logic layer
        applicationService.js   CRUD, filtering, sorting
        authService.js          Authentication + JWT
        reportService.js        Pre-built reports
        analyticsService.js     7 analytics aggregation pipelines
      controllers/              HTTP request handlers
      middleware/               Auth, validation, error handler, logger
      routes/                   Express routers
      utils/                    Auto-tag engine, email templates
    server.js                   Entry point with graceful shutdown
    seed.js                     Database seeder (65 realistic records)
```

## Features

### Public Portal
- **Hero page** — animated landing with stats and CTA
- **About Us** — 7 sections (overview, group structure, vision, empowerment, impact, metrics, opportunity)
- **Gateway** — profile selection (Developer, Landowner, Investor, Operator, Professional, Aspiring)
- **Multi-step registration form** — 5 steps with validation, auto-save, profile-specific fields
- **Success page** — reference number display
- **Responsive design** — mobile-first with hamburger nav, safe areas, touch targets

### Admin Portal
- **Dashboard** — KPI cards, conversion funnel, profile breakdown, top tags, quick actions, recent applications
- **Leads Management** — search, filter by type/status, card + table views, shortlist toggle, bulk status change, CSV export (all records)
- **Analytics** — conversion funnel, submission trends (day/week/month), tag distribution + co-occurrence, demographics (value/funding/land), deal room metrics, date range selector
- **Reports** — 4 pre-built reports (High Value, Pipeline Ready, Institutional Grade, Deal Room Shortlist) with results table and export
- **Deal Room** — summary KPIs, funder assignment bar, search, summit access / deal room entry toggles, funder chip assignment
- **Audit Log** — event timeline with category filters, pagination, actor/target tracking
- **Application Detail Modal** — full form data display, status change dropdown, admin notes editor, profile-specific fields, ESC to close

### Backend
- **Microservice architecture** — Controller → Service → Model pattern
- **Auto-tagging engine** — 20+ intelligence tags based on form data (HIGH_VALUE, PIPELINE_READY, INSTITUTIONAL_GRADE, etc.)
- **Analytics system** — 7 endpoints with MongoDB aggregation pipelines, event tracking on all mutations
- **Email notifications** — submission confirmation + status change emails (reviewing, shortlisted, invited, funded)
- **Bulk operations** — bulk status change (max 100 per batch)
- **Security** — JWT auth, input sanitization on PATCH (allowlisted fields), rate limiting on login, CORS configuration, regex escaping on search

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

Set `VITE_API_URL` environment variable to point to your backend (e.g. `http://localhost:5000/api`).

### Backend

```bash
cd backend
cp .env.example .env  # Edit with your MongoDB URI + JWT secret
npm install
npm run dev           # http://localhost:5000 (nodemon)
```

### Seed Data

```bash
cd backend
node seed.js          # Creates 65 realistic applications
node seed.js --force  # Clear + re-seed
```

### Environment Variables (Backend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/bemore` | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | `dev-secret-change-me` | JWT signing key |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiry |
| `CORS_ORIGIN` | No | `*` | Allowed origins (comma-separated) |
| `SMTP_HOST` | No | — | SMTP host (emails disabled if empty) |
| `SMTP_PORT` | No | 587 | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `SMTP_FROM` | No | `noreply@bemore.co.za` | From address |
| `ADMIN_SEED_EMAIL` | No | `admin@bemore.co.za` | Default admin email |
| `ADMIN_SEED_PASSWORD` | No | `BeMore@2026!` | Default admin password |

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/applications` | Submit application |

### Admin (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/verify` | Verify token |
| GET | `/api/applications` | List with filters, sort, pagination |
| GET | `/api/applications/stats` | Aggregate statistics |
| GET | `/api/applications/export/csv` | CSV export |
| GET | `/api/applications/:id` | Single application |
| PATCH | `/api/applications/:id` | Update (status, dealRoom, adminNotes) |
| POST | `/api/applications/bulk-status` | Bulk status change |
| GET | `/api/reports/:name` | Run pre-built report |
| GET | `/api/analytics/dashboard` | KPI dashboard |
| GET | `/api/analytics/funnel` | Conversion funnel |
| GET | `/api/analytics/trends` | Submission trends |
| GET | `/api/analytics/tags` | Tag analytics |
| GET | `/api/analytics/demographics` | Application demographics |
| GET | `/api/analytics/deal-room` | Deal room analytics |
| GET | `/api/analytics/events` | Audit event log |

## Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```
Set `VITE_API_URL` in Vercel environment variables.

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set root directory to `backend`
3. Add MongoDB plugin
4. Set environment variables (MONGODB_URI, JWT_SECRET, CORS_ORIGIN)

## Design System

- **Dark luxury editorial** — gold (`#c9a84c`) on near-black (`#0a0a0f`)
- **Fonts**: Cormorant Garamond (headings), DM Sans (body), DM Mono (mono)
- **Breakpoints**: 600px (SM), 905px (MD), 1240px (LG)
- **Touch targets**: 48px minimum
- **Animations**: Reduced motion respected via `prefers-reduced-motion`

## Admin Credentials (Default)

```
Email:    admin@bemore.co.za
Password: BeMore@2026!
```

## License

Private — BeMore Group (Pty) Ltd
