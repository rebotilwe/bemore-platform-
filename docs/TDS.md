# Technical Design Specification (TDS)

**Project**: BeMore — SME Access Initiative Platform
**Version**: 1.0
**Date**: 31 March 2026
**Author**: Bukani Tech Solutions
**Status**: Production

---

## 1. Executive Summary

BeMore is a full-stack web application serving as the digital engagement and data capture platform for the BeMore SME Access Initiative. The platform connects South African property developers, landowners, student accommodation operators, and built environment professionals with institutional funding partnerships through PBSA.

The system handles the complete applicant lifecycle: registration, merit-based review, deal room shortlisting, summit invitation, and funding confirmation — with full admin analytics, audit logging, and email notifications.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USERS (Browser)                      │
│         Desktop / Mobile / PWA / QR Code Entry           │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                VERCEL (Frontend Host)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Vite Static Build (HTML/CSS/JS)                  │   │
│  │  - Service Worker (v2, stale-while-revalidate)    │   │
│  │  - Vercel Analytics + Speed Insights              │   │
│  │  - Security Headers (X-Frame, CSP, Referrer)      │   │
│  │  - Cache: immutable for /assets/*, 24h for icons  │   │
│  └──────────────────────────────────────────────────┘   │
│                      │ /api/* rewrite                    │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│              RAILWAY (Backend Host)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Express.js (Node 18+, ESM)                       │   │
│  │  - Trust proxy (1)                                │   │
│  │  - Compression (gzip)                             │   │
│  │  - CORS (explicit origins)                        │   │
│  │  - Helmet (security headers)                      │   │
│  │  - 5-tier rate limiting                           │   │
│  │  - JWT authentication                             │   │
│  │  - Winston structured logging                     │   │
│  └───────────────────┬──────────────────────────────┘   │
└──────────────────────┼──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              MONGODB ATLAS (Database)                     │
│  Collections:                                            │
│  - applications (TTL: 24 months)                         │
│  - admins                                                │
│  - analyticsevents (TTL: 1 year)                         │
│  - emaillogs                                             │
│  - sitesettings                                          │
│  - polls, pollvotes                                      │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              SMTP (mail.bts-app.co.za:465)               │
│  - 6 email templates (co-branded BeMore x PBSA)          │
│  - Delivery tracked in EmailLog collection               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Frontend Runtime | Vanilla TypeScript | ES2022 | Zero-framework for minimal bundle, fast load |
| Build Tool | Vite | 6.x | Fast HMR, optimized production builds |
| Backend Runtime | Node.js | 18+ | ESM modules, stable LTS |
| Web Framework | Express | 4.x | Mature, lightweight, extensive middleware |
| Database | MongoDB | 7.x (Atlas) | Flexible schema for mixed formData, built-in TTL |
| ODM | Mongoose | 8.x | Schema validation, middleware hooks, aggregation |
| Auth | JWT (jsonwebtoken) | 9.x | Stateless, scalable |
| Email | Nodemailer | 6.x | SMTP transport, reliable delivery |
| Monitoring | Vercel Analytics + Speed Insights | 2.x | Real User Monitoring, Core Web Vitals |
| Logging | Winston | 3.x | Structured JSON, log levels |

### 2.3 Frontend Architecture

**Pattern**: Vanilla TypeScript SPA with hash-based routing

```
src/
├── main.ts            # Entry: analytics init, backend check, SW registration
├── router.ts          # Hash router with auth guards, lazy page loading
├── api.ts             # HTTP client with retry, timeout, auto-logout on 401
├── store.ts           # Reactive state (get/set/subscribe pattern)
├── auth.ts            # JWT management, session verify
├── pages/
│   ├── public/        # 8 public pages (hero, form, status, etc.)
│   └── admin/         # 10 admin pages (dashboard, leads, analytics, etc.)
├── components/        # 8 shared components
├── constants/         # Configuration constants (summit-config centralized)
├── utils/             # Validation (SA phone), formatting, auto-tag
└── styles/            # CSS Modules (tokens + 29 files)
```

**Key patterns**:
- Each page exports `{ render(): string, mount(): void, unmount?(): void }`
- Router calls `render()` for HTML, then `mount()` for event listeners
- API client auto-falls back to localStorage when backend is unreachable (demo mode)
- Form state auto-saved to localStorage every 30 seconds
- Summit config centralized in `constants/summit-config.ts` with `ACTIVE` toggle

### 2.4 Backend Architecture

**Pattern**: Layered MVC with service layer

```
Routes → Middleware → Controllers → Services → Models → MongoDB
                                        ↓
                                  Analytics (fire-and-forget event tracking)
                                  EmailLog (delivery tracking)
```

**Middleware stack** (order matters):
1. Request logger (Winston)
2. Compression (gzip)
3. JSON body parser (100kb limit)
4. CORS (explicit origins, credentials)
5. Helmet (security headers)
6. Rate limiters (per-route)
7. JWT auth (admin routes only)
8. Input validation (express-validator)
9. Error handler (catch-all)

---

## 3. Data Model

### 3.1 Application (primary entity)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| refNumber | String | unique, auto-generated | `BM-XXXXXXXX` format |
| userType | String | enum: 6 categories | developer, landowner, investor, student, professional, aspiring |
| personal | Object | required | firstName, surname, email, phone (+27), companyName? |
| formData | Mixed | max 50KB | 5-step form responses |
| tags | [String] | auto-generated | Intelligence tags (20+ types) |
| status | String | enum: 5 statuses | new → reviewing → shortlisted → invited → funded |
| engagementSource | String | default: 'direct' | QR tracking source |
| classification | String | enum: 4 values | Admin-set: hot, warm, cold, unclassified |
| followUp | Object | optional | required, dueDate, notes, completedAt |
| dealRoom | Object | default values | summitAccess, dealRoomEntry, funders[] |
| adminNotes | String | optional | Internal notes |
| submittedAt | Date | TTL: 24 months | POPIA auto-deletion |

**Indexes**: email, status, userType, tags, submittedAt, classification, engagementSource, refNumber+email (compound), dealRoom.summitAccess

### 3.2 AnalyticsEvent (audit trail)

| Field | Type | Description |
|-------|------|-------------|
| event | String | Event name (e.g., `application.submitted`) |
| category | String | application, admin, auth, report, system, poll |
| actor | Object | { type, id?, email? } |
| target | Object | { model?, id?, refNumber? } |
| meta | Mixed | Event-specific metadata |
| ip | String | Client IP |
| timestamp | Date | TTL: 1 year |

### 3.3 EmailLog (delivery tracking)

| Field | Type | Description |
|-------|------|-------------|
| to | String | Recipient email |
| subject | String | Email subject line |
| template | String | Template identifier |
| refNumber | String | Associated application |
| status | String | sent or failed |
| error | String | Error message (if failed) |
| sentAt | Date | Timestamp |

### 3.4 SiteSettings (admin config)

| Field | Type | Description |
|-------|------|-------------|
| key | String | Setting key (e.g., `mentimeter_id`) |
| value | Mixed | Setting value |
| updatedAt | Date | Last modified |

---

## 4. Security Architecture

### 4.1 Authentication
- JWT tokens with configurable expiry (default 8h)
- bcryptjs (10 rounds) for password hashing
- Auto-logout on 401 response (frontend)
- Login rate limited to 10 attempts per 15 minutes

### 4.2 Authorization
- Admin routes protected by JWT middleware
- Public routes have no auth but are rate-limited
- POPIA endpoints require refNumber + email verification

### 4.3 Input Validation
- express-validator on all routes
- FormData whitelist (known keys only, unknown stripped)
- 100KB body size limit
- SA phone regex validation (frontend + backend)
- Duplicate prevention: email + userType uniqueness check

### 4.4 Infrastructure Security
- CORS: explicit origin allowlist (no wildcard)
- Helmet: standard security headers
- Trust proxy: accurate IP for rate limiting
- Security headers via Vercel: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- Environment validation: app refuses to start without required secrets in production
- No credentials in source code (scrubbed from git history)

### 4.5 Rate Limiting (5 tiers)

| Tier | Window | Max Requests | Applied To |
|------|--------|-------------|------------|
| Health | 1 min | 200 | `GET /api/health` |
| Public | 15 min | 100 | Application submission, lookup, POPIA |
| Admin | 15 min | 300 | All authenticated admin endpoints |
| Auth | 15 min | 10 | Login attempts |
| Vote | 15 min | 60 | Poll voting |

---

## 5. Reliability & Performance

### 5.1 Database
- MongoDB Atlas with connection retry (3 attempts, exponential backoff: 2s/4s/8s)
- Indexed queries on all filter/sort fields
- TTL indexes for POPIA compliance (24 months) and analytics cleanup (1 year)

### 5.2 Caching
- Service worker (v2): stale-while-revalidate for static assets
- Vite hashed filenames: immutable 1-year cache headers
- SMTP health check: 60-second cache to avoid per-request transport creation

### 5.3 Error Handling
- Global error boundary (frontend): catches unhandled errors, shows retry UI
- Express error handler: Mongoose validation, cast, duplicate key, JSON parse, JWT errors
- Process-level: unhandledRejection logged, uncaughtException triggers graceful shutdown
- Graceful shutdown: stop accepting connections, drain in-flight requests (15s), disconnect DB

### 5.4 Monitoring
- Vercel Analytics: page views, visitors, referrers
- Vercel Speed Insights: Core Web Vitals (LCP, FID, CLS)
- Winston structured logging: all API requests, errors, business events
- Email delivery tracking: sent/failed status logged per email

---

## 6. POPIA Compliance

| Requirement | Implementation |
|-------------|---------------|
| Consent | Explicit checkboxes (T&Cs + POPIA) on registration step 5 |
| Data minimization | Only collect fields necessary for funding evaluation |
| Retention limit | 24-month TTL index on `submittedAt` (MongoDB auto-delete) |
| Right to access | `POST /api/applications/data-export` — JSON download |
| Right to deletion | `POST /api/applications/data-delete` — permanent removal |
| Audit trail | All data rights actions tracked in AnalyticsEvent |
| PII protection | Status lookup returns limited fields only, admin data never exposed |
| PII in logs | Structured logging avoids PII; admin email not logged in seed |

---

## 7. Deployment Architecture

### 7.1 Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | localhost:3000 (Vite) | localhost:5000 (nodemon) | localhost:27017 or Atlas |
| Production | Vercel (auto-deploy from `main`) | Railway (auto-deploy from `main`) | MongoDB Atlas |

### 7.2 CI/CD
- Push to `main` triggers both Vercel and Railway deployments
- Frontend: Vite build → static files → Vercel CDN
- Backend: Railway builds from `backend/` directory
- API proxy: Vercel rewrites `/api/*` → Railway backend

### 7.3 Infrastructure Diagram

```
GitHub (main branch)
  ├── Vercel (frontend auto-deploy)
  │     ├── CDN: static assets (global edge)
  │     ├── Rewrite: /api/* → Railway
  │     └── Headers: security + cache
  └── Railway (backend auto-deploy)
        ├── Express server
        ├── MongoDB Atlas connection
        └── SMTP: mail.bts-app.co.za
```

---

## 8. API Design

### 8.1 Response Envelope

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 150, "page": 1, "limit": 50, "pages": 3 }
}
```

Error response:
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [ { "field": "email", "message": "Valid email required" } ]
}
```

### 8.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created (new application) |
| 400 | Validation error |
| 401 | Missing/invalid JWT |
| 404 | Resource not found |
| 409 | Duplicate application (email + userType) |
| 429 | Rate limit exceeded |
| 503 | Service degraded (DB down) |

---

## 9. Testing Strategy

| Layer | Framework | Tests | Coverage |
|-------|-----------|-------|----------|
| Backend API | Jest + mongodb-memory-server + supertest | 55 | Application CRUD, auth, stats, bulk ops, health |
| Frontend Utils | Vitest + jsdom | 43 | Validation (SA phone), auto-tagging (27 scenarios), formatting |

Test commands:
```bash
cd backend && npm test           # Jest (sequential, test env)
cd frontend && npx vitest run    # Vitest
```

---

## 10. Future Considerations

- **History-mode routing**: Migrate from hash-based to history-based for better SEO
- **File uploads**: Applicant document attachments (business plans, land titles)
- **SMS/WhatsApp**: BulkSMS or Africa's Talking for mobile notifications
- **Scheduled jobs**: Automated summit reminders via cron
- **Multi-tenant**: Extend platform for multiple summit events
- **Custom domain**: Full migration to `bemorecapital.co.za` when DNS is ready
