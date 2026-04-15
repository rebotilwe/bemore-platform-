# BeMore Platform — Presentation Guide

**BeMore SME Access Initiative**
Connecting South African property developers, landowners, and built environment professionals with institutional funding through PBSA.

**Live URL**: https://bemore-tawny.vercel.app
**API**: https://bemore-production.up.railway.app

---

## 1. Public User Journey

### 1.1 Hero Page
The landing experience. Dark luxury editorial design with gold accents, animated stats, and clear CTAs.

![Hero Page](screenshots/01-hero.png)

**Key points:**
- BeMore Group logo + PBSA co-branding
- "Apply Now" and "Learn More" CTAs
- Summit banner (toggleable from admin settings)
- Responsive — works on mobile, tablet, desktop

---

### 1.2 QR Landing Page
Entry point for summit attendees scanning QR codes on brochures, banners, and badges. Source is tracked automatically.

![QR Landing](screenshots/02-landing-qr.png)

**Key points:**
- Co-branded BeMore x PBSA
- Summit date and venue (when summit mode is active)
- Direct CTA to start application
- Source tracking — `?src=qr-brochure` captured for analytics

---

### 1.3 Gateway — Profile Selection
Users select their profile category before entering the registration form.

![Gateway](screenshots/03-gateway.png)

**6 profile categories:**
1. Property Developer
2. Landowner
3. Investor
4. Student Accommodation Operator
5. Built Environment Professional
6. Aspiring Developer

---

### 1.4 Multi-Step Registration Form
5-step form with profile-specific fields, real-time validation, and auto-save.

**Steps:**
1. **Personal Info** — Name, email, SA phone validation (+27 format), company
2. **Readiness Assessment** — Experience, development types, land status (varies by profile)
3. **Funding & Project** — Estimated value, project stage, funding history, seeking
4. **Project Description** — Free-text project pitch + why choose you
5. **Confirmation** — Summit attendance, T&Cs consent, POPIA consent

**Features:**
- SA phone validation (0XX or +27XX format)
- Duplicate prevention (same email + userType = 409)
- Auto-save every 30 seconds
- Profile-specific fields per category
- Auto-tagging engine applies 20+ intelligence tags on submit

---

### 1.5 About Us
Scrollable sections covering the BeMore initiative.

![About](screenshots/04-about.png)

**Sections:** Overview, Group Structure, Vision, Empowerment, Impact, Metrics, Opportunity

---

### 1.6 Status Lookup
Applicants check their application status using reference number + email.

![Status Lookup](screenshots/06-status-lookup.png)

**Features:**
- 5-stage progress tracker (New > Reviewing > Shortlisted > Invited > Funded)
- Intelligence tags display
- Summit access badge
- **POPIA data rights**: Export data (JSON) or permanently delete

---

### 1.7 Mentee Meter
Live polling page with admin-configurable Mentimeter embed or built-in poll system.

![Mentee Meter](screenshots/05-mentee-meter.png)

---

## 2. Admin Portal

### 2.1 Admin Login
JWT authentication with 8-hour token expiry and 10 req/15min rate limit.

![Admin Login](screenshots/07-admin-login.png)

---

### 2.2 Dashboard
Real-time KPI overview with conversion funnel, profile breakdown, and engagement tracking.

![Dashboard](screenshots/08-admin-dashboard.png)

**KPIs shown:**
- Total applications
- Conversion funnel (New > Reviewing > Shortlisted > Invited > Funded)
- Profile type breakdown with percentages
- Engagement source tracking (direct, QR brochure, QR banner, etc.)
- Lead classification breakdown (hot/warm/cold)
- Top intelligence tags
- Recent applications with quick actions

---

### 2.3 Leads Management
Full CRM-style leads table with search, filter, sort, and bulk actions.

![Leads](screenshots/09-admin-leads.png)

**Features:**
- Search by name, email, or reference number
- Filter by profile type and status
- Sortable columns (name, type, status, date)
- Card view (mobile) + table view (desktop)
- **Bulk actions:** Change status, Send summit reminders
- Individual lead detail modal with:
  - Status change
  - Classification (hot/warm/cold)
  - Follow-up tracking (due date + notes)
  - Deal room controls (summit access, funders)
  - Admin notes
- CSV export (16 columns with formula injection protection)

---

### 2.4 Analytics
7 analytics views powered by MongoDB aggregation pipelines.

![Analytics](screenshots/10-admin-analytics.png)

**Views:**
1. **Dashboard KPIs** — Total apps, period breakdown, event categories
2. **Conversion Funnel** — New > Reviewing > Shortlisted > Invited > Funded
3. **Submission Trends** — Daily/weekly/monthly with profile type breakdown
4. **Tag Distribution** — Tag frequency + co-occurrence matrix
5. **Demographics** — By type, estimated value, funding history, land status
6. **Deal Room** — Summit access, deal room entry, funder distribution
7. **Event Log** — Paginated audit trail with actor badges, category filters

---

### 2.5 Reports
4 pre-built intelligence reports with PDF and CSV export.

![Reports](screenshots/11-admin-reports.png)

| Report | Filter | Purpose |
|--------|--------|---------|
| **Funding Threshold** | HIGH_VALUE or LARGE_CAPITAL tags | High-value deal opportunities |
| **Land Readiness** | PIPELINE_READY tag | Land-secured, active project stage |
| **Student Housing** | INSTITUTIONAL_GRADE tag | Operators meeting institutional criteria |
| **Deal Room Shortlist** | Status: shortlisted or invited | Ready for funding partner alignment |

**Export options:**
- **PDF** — Print-ready report with summary stats, type/status breakdown, top tags, application table, and detailed profiles
- **CSV** — Full data export with formula injection protection

---

### 2.6 Deal Room
Manage summit access and PBSA funding partner alignment.

![Deal Room](screenshots/12-admin-dealroom.png)

**Features:**
- Summary KPIs (summit access count, deal room entries)
- PBSA funder assignment
- Summit access / deal room entry toggles per application
- Search and filter

---

### 2.7 Audit Log
Complete event timeline for compliance and operational visibility.

![Audit Log](screenshots/13-admin-auditlog.png)

**Features:**
- Category filters (Admin, Application, Auth, System)
- Actor badges (Admin/Applicant/System)
- Event metadata expansion
- IP tracking
- Pagination (50 per page)

---

### 2.8 QR Generator
Generate branded QR codes for physical materials.

![QR Generator](screenshots/14-admin-qr.png)

**Source tags:** qr, qr-brochure, qr-banner, qr-badge, qr-flyer
**Output:** Branded preview, high-res download, URL copy

---

### 2.9 Live Polls
Built-in polling system with real-time results via Server-Sent Events.

![Polls](screenshots/18-admin-polls.png)

**Question types:**
- Multiple choice (with color-coded options)
- Rating scale (1-5 or 1-10)
- Word cloud (text frequency visualization)
- Open text

**Admin controls:**
- Create/edit polls (draft mode)
- Activate/pause/close lifecycle
- Navigate between questions live
- View real-time results with charts
- Export detailed results

**Public voting:**
- Deduplicated per session (unique index)
- Real-time SSE updates to all connected viewers

---

### 2.10 Settings
Platform-wide configuration.

![Settings](screenshots/21-admin-settings.png)

**Configurable:**
- **Summit Mode** — Toggle all summit content on/off across public pages
- **Summit Date/Venue** — Dynamic across hero, landing, success, form
- **Mentimeter Embed ID** — For live poll integration

---

### 2.11 Admin Guide
Comprehensive in-app documentation for platform administrators.

![Guide](screenshots/15-admin-guide.png)

---

## 3. Mobile Experience

### 3.1 Mobile Hero
Fully responsive with hamburger nav, safe areas, 48px touch targets.

![Mobile Hero](screenshots/16-mobile-hero.png)

### 3.2 Mobile Landing
QR landing optimized for mobile scanning.

![Mobile Landing](screenshots/17-mobile-landing.png)

---

## 4. Email System

All emails are co-branded (BeMore x PBSA) with logo header, reference number, gold CTA buttons, and summit info card. Every send is logged to the `EmailLog` collection.

| Email | Trigger | Purpose |
|-------|---------|---------|
| Submission Confirmation | User submits form | Welcome + ref number + next steps |
| Under Review | Admin sets "reviewing" | 5-day timeline, status check link |
| Shortlisted | Admin sets "shortlisted" | PBSA mention, status check link |
| Summit Invitation | Admin sets "invited" | Full event details (date, venue, dress code) |
| Funding Confirmed | Admin sets "funded" | Partnership confirmed, onboarding steps |
| Summit Reminder | Admin sends via leads page | Event details, check-in, live poll link |

---

## 5. Technical Highlights

### Security & Hardening
- JWT auth with 8h expiry
- 5-tier rate limiting (health, public, admin, auth, vote)
- CORS explicit origin whitelist
- Helmet security headers
- CSV formula injection prevention
- Settings key whitelist
- Poll prototype pollution prevention
- Input validation (SA phone, email max 254 chars)
- CastError values not leaked

### POPIA Compliance
- Explicit consent (T&Cs + POPIA checkboxes)
- 24-month TTL auto-delete
- Self-service data export and deletion
- PII never in public responses
- All data rights actions audited

### Resilience
- MongoDB 3x retry with exponential backoff
- Graceful shutdown (drain connections, 15s timeout)
- Offline demo mode (localStorage fallback)
- PWA with service worker v2

### Testing
- **Backend**: 71 tests (Jest + mongodb-memory-server)
- **Frontend**: 43 tests (Vitest + jsdom)
- **CI/CD**: GitHub Actions (test + typecheck + build + security audit)

### Deployment
- **Frontend**: Vercel (auto-deploy from `main`)
- **Backend**: Railway (Nixpacks, restart-on-failure)
- **API Proxy**: Vercel rewrites `/api/*` to Railway

---

## 6. Taking Updated Screenshots

```bash
# Requires playwright installed (root package.json)
cd BeMore
ADMIN_EMAIL=sibanyebukani01@gmail.com ADMIN_PASS='04011994Flex33$' node docs/take-screenshots.mjs
```

Screenshots saved to `docs/screenshots/` (19 images).
