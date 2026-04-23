# POPIA Compliance Documentation -- BeMore Platform

**Last updated**: 24 Apr 2026
**Document owner**: Bukani Tech Solutions (Pty) Ltd
**Review cadence**: Annually, or upon material change to data processing

---

## 1. Overview

The Protection of Personal Information Act, 2013 (POPIA) is South Africa's primary data protection legislation. It regulates how personal information is collected, stored, processed, and shared. POPIA came into full effect on 1 July 2021, with enforcement by the Information Regulator.

### Why POPIA applies to BeMore

BeMore is a live engagement and data capture platform for the BeMore SME Access Initiative. It collects personal information from South African property developers, landowners, investors, students, and built environment professionals in order to connect them with institutional funding partnerships through PBSA.

The platform:

- Collects names, email addresses, phone numbers, and company names during registration.
- Processes application data through a multi-step form covering readiness, funding needs, project details, and consent.
- Stores and classifies applicant data using an auto-tagging engine (e.g., HIGH_VALUE, PIPELINE_READY).
- Sends transactional emails (submission confirmations, status notifications, summit reminders).
- Tracks site analytics (page views, sessions, form funnel events) using pseudonymous visitor IDs.
- Provides an admin interface for managing leads, generating reports, and exporting data.

BeMore therefore acts as a **responsible party** under POPIA, with Bukani Tech Solutions as the **operator** processing data on behalf of the BeMore SME Access Initiative.

---

## 2. Data Inventory

| Data Element | Source | Purpose | Legal Basis | Retention |
|---|---|---|---|---|
| First name, surname | Registration form (Step 1) | Identify the applicant, personalise communications | Consent (form submission) | 24 months from submission |
| Email address | Registration form (Step 1) | Transactional emails, duplicate prevention, data subject requests | Consent + Legitimate interest | 24 months from submission |
| Phone number (+27 normalised) | Registration form (Step 1) | Contact for follow-up, summit coordination | Consent | 24 months from submission |
| Company name (optional) | Registration form (Step 1) | Assess organisational context for funding matching | Consent | 24 months from submission |
| User type (category) | Registration form (Step 1) | Route applicant through correct form flow | Consent | 24 months from submission |
| Form data (readiness, funding, project) | Registration form (Steps 2-4) | Assess eligibility, auto-tag for deal room | Consent | 24 months from submission |
| Consent acknowledgement | Registration form (Step 5) | Record lawful basis for processing | Legal obligation | 24 months from submission |
| Auto-generated tags | System-derived from form data | Classify applicants for funding pipeline | Legitimate interest | 24 months (tied to application) |
| Reference number (BM-XXXXXXXX) | System-generated | Unique identifier for data subject requests | Legitimate interest | 24 months (tied to application) |
| Engagement source | URL parameter / QR scan | Measure campaign effectiveness | Legitimate interest | 24 months (tied to application) |
| Email delivery logs | Transactional email system | Audit email delivery, troubleshoot failures | Legitimate interest | 24 months |
| Admin audit logs | Admin actions | FICA compliance, security auditing | Legal obligation (FICA) | 7 years |
| Page views (pseudonymous) | Client-side tracker | Site traffic analytics | Legitimate interest | 12 months |
| Tracking events (pseudonymous) | Client-side tracker | Form funnel and CTA analytics | Legitimate interest | 12 months |
| IP address (partial) | Server request context | Rate limiting, fraud prevention | Legitimate interest | 12 months (in PageView/TrackingEvent) |
| Admin credentials (email, hashed password) | Seeded / admin-created | Platform administration access | Legitimate interest | Until account deletion |

### Data not collected

BeMore does **not** collect: SA ID numbers, credit card numbers, banking details, biometric data, health information, or criminal records.

---

## 3. Data Subject Rights Implementation

POPIA grants data subjects (applicants) the following rights. BeMore implements each as follows:

### 3.1 Right of Access (Section 23)

**Endpoint**: `POST /api/applications/data-export`

Data subjects can request a full export of their personal information by providing their reference number and registered email address. The system returns all stored application data including personal details, form data, tags, status, and engagement history.

**Process**:
1. Applicant navigates to the status page (`/#/status`).
2. Enters their reference number and email.
3. System verifies identity by matching both fields.
4. Full application record is returned as JSON.

**Rate limiting**: Public endpoint is rate-limited to 100 requests per 15 minutes to prevent abuse.

### 3.2 Right to Deletion (Section 24(1)(d))

**Endpoint**: `POST /api/applications/data-delete`

Data subjects can request permanent deletion of their personal information.

**Process**:
1. Applicant provides reference number, email, and explicit confirmation string `"DELETE"`.
2. System verifies identity by matching reference number and email.
3. Application record is permanently removed from the database.
4. Associated email logs are deleted.
5. Action is recorded in the AdminAuditLog (with redacted PII) for compliance auditing.

**Safeguards**:
- Triple verification: reference number + email + explicit `"DELETE"` confirmation.
- Deletion is irreversible. The applicant is informed of this before confirming.
- The audit log entry records that a deletion occurred without retaining the deleted PII.

### 3.3 Right to Correction (Section 24(1)(a))

Data subjects who need to correct their personal information can contact the platform administrator. Corrections are made through the admin interface:

- Admin navigates to `/#/admin/leads`.
- Locates the application by reference number or search.
- Updates personal details or form data via the edit modal.
- All changes are logged in the AdminAuditLog.

A self-service correction endpoint is planned for a future release.

### 3.4 Right to Object (Section 11(3)(b))

Data subjects who object to processing can exercise their right to deletion (Section 3.2 above). Upon deletion, all personal information is permanently removed and no further processing occurs.

For objections to specific processing activities (e.g., email communications), applicants can contact the platform administrator to have their record flagged.

---

## 4. Technical Safeguards

### 4.1 Encryption in Transit

- All client-server communication uses HTTPS/TLS (enforced by Vercel and Railway).
- Backend API endpoints are served behind TLS-terminating proxies.
- SMTP email delivery uses TLS on port 465 (`mail.bts-app.co.za`).

### 4.2 PII Redaction in Logs

The `redactPII` utility (`backend/src/utils/redactPII.js`) automatically sanitises personal information before it reaches application logs:

| Data Type | Redaction Pattern | Example |
|---|---|---|
| Email addresses | `u***@domain.co.za` | `john@example.com` becomes `j***@example.com` |
| SA phone numbers | `+27*****6789` | `+27821234567` becomes `+27*****4567` |
| SA ID numbers | `******234***` | `9001011234567` becomes `******234***` |
| IPv4 addresses | `192.168.*.*` | First two octets preserved, last two masked |
| IPv6 addresses | `[REDACTED_IPv6]` | Fully redacted |
| Passwords, tokens, API keys | `[REDACTED]` | Key names matched: `password`, `token`, `secret`, `apiKey`, `jwt`, `accessToken`, `refreshToken` |

Winston structured logging is the sole logging mechanism. `console.log` is prohibited in production.

### 4.3 Rate Limiting

Multiple rate-limiting tiers protect against abuse and data scraping:

| Tier | Limit | Scope |
|---|---|---|
| Health check | 200 requests/minute | `/api/health` |
| Public endpoints | 100 requests/15 minutes | Application submission, data export, data delete |
| Admin endpoints | 300 requests/15 minutes | All authenticated admin routes |
| Authentication | 10 requests/15 minutes | Login attempts |
| Poll voting | 60 requests/15 minutes | Vote submission |

Rate limiting uses `express-rate-limit` with `trust proxy` enabled for accurate IP detection behind Vercel/Railway proxies.

### 4.4 Security Headers

Applied via Helmet middleware and Vercel configuration:

- `X-Frame-Options: DENY` -- prevents clickjacking.
- `X-Content-Type-Options: nosniff` -- prevents MIME-type sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` -- limits referrer leakage.
- `Permissions-Policy` -- restricts browser feature access.

### 4.5 JWT Authentication for Admin Access

- Admin routes require a valid JWT token in the `Authorization` header.
- Tokens expire after 8 hours (`JWT_EXPIRES_IN=8h`).
- `JWT_SECRET` must be at least 32 characters; the application exits on startup if missing in production.
- Admin passwords are hashed with bcryptjs before storage.

### 4.6 Input Validation and Sanitisation

- Email addresses are validated and capped at 254 characters.
- Classification values are validated against an allowed enum.
- Application updates use a `sanitizeUpdate` whitelist to prevent mass assignment.
- Poll updates use whitelist-based field assignment to prevent prototype pollution.
- CSV exports sanitise cell values to prevent formula injection (prefixes `=`, `+`, `-`, `@`).
- Settings writes enforce an `ALLOWED_SETTINGS` whitelist.
- Mongoose `CastError` handling prevents leaking raw database values in error responses.

### 4.7 CORS Policy

- Explicit origin list only (no wildcards).
- Credentials, methods, and headers are restricted.
- Configured via the `CORS_ORIGIN` environment variable.

---

## 5. Data Retention Schedule

| Data Type | Collection | Retention Period | Deletion Method | Legal Basis |
|---|---|---|---|---|
| Application records | `Application` | 24 months from submission | MongoDB TTL index on `submittedAt` (auto-delete) | POPIA -- minimum necessary |
| Email delivery logs | `EmailLog` | 24 months from send date | MongoDB TTL index on `sentAt` (auto-delete) | POPIA -- minimum necessary |
| Admin audit logs | `AdminAuditLog` | 7 years from event date | MongoDB TTL index on `timestamp` (auto-delete) | FICA -- regulatory requirement |
| Page view analytics | `PageView` | 12 months from event date | MongoDB TTL index on `timestamp` (auto-delete) | Legitimate interest |
| Tracking events | `TrackingEvent` | 12 months from event date | MongoDB TTL index on `timestamp` (auto-delete) | Legitimate interest |
| Admin accounts | `Admin` | Until manually deleted | Manual deletion by system administrator | Legitimate interest |
| Site settings | `SiteSettings` | Indefinite (operational config) | Manual deletion | Operational necessity |
| Poll records | `Poll`, `PollResponse` | Indefinite (event data) | Manual deletion | Legitimate interest |

### Early deletion

Data subjects may request deletion at any time via `POST /api/applications/data-delete`, which permanently removes the application record before the TTL expiry. This constitutes the "right to erasure" under POPIA.

### TTL implementation detail

MongoDB TTL indexes run a background task approximately every 60 seconds to remove expired documents. Actual deletion may occur shortly after the expiry threshold, not precisely at the retention boundary.

---

## 6. Breach Response Procedure

In the event of a personal information breach (unauthorised access, disclosure, or loss), the following procedure applies per POPIA Section 22:

### 6.1 Detection

- Application error logs and admin audit logs are monitored for anomalous activity.
- Failed login attempts are logged with IP and user agent (`login_failed` audit events).
- Rate limiting alerts on threshold breaches may indicate scraping or brute-force attempts.
- Third-party providers (Railway, Vercel, MongoDB Atlas) issue their own breach notifications.

### 6.2 Containment (Immediate -- within 1 hour)

1. Identify the scope of the breach (what data, how many records, attack vector).
2. Revoke compromised credentials (rotate `JWT_SECRET`, database passwords, SMTP credentials).
3. Block malicious IPs or disable compromised admin accounts.
4. Preserve evidence -- do not delete logs or audit trails.

### 6.3 Assessment (Within 24 hours)

1. Determine whether personal information was accessed, disclosed, or lost.
2. Identify affected data subjects and the categories of personal information involved.
3. Assess the risk of harm to affected data subjects.
4. Document findings in an incident report.

### 6.4 Notification (Within 72 hours)

Per POPIA Section 22(1), if there are reasonable grounds to believe that personal information has been compromised:

**Notify the Information Regulator**:
- Submit notification via the Information Regulator's prescribed form.
- Include: nature of the breach, categories of data, estimated number of data subjects, measures taken.
- Contact: Information Regulator, SALU Building, 316 Thabo Sehume Street, Pretoria.
- Email: complaints.IR@justice.gov.za
- Tel: 012 406 4818

**Notify affected data subjects**:
- Communicate via email to the registered email addresses of affected applicants.
- Include: description of the breach, what data was involved, steps taken, recommended protective actions.
- Use clear, plain language (not legalese).

### 6.5 Remediation (Ongoing)

1. Implement technical fixes to close the vulnerability.
2. Update security controls as needed.
3. Conduct a post-mortem review and document lessons learned.
4. Update this compliance documentation if processes change.
5. Retain the incident report for at least 7 years (FICA audit trail).

---

## 7. Third-Party Data Processors

BeMore relies on the following third-party processors. Each must maintain adequate data protection measures per POPIA Section 21:

| Processor | Role | Data Processed | Location | Safeguards |
|---|---|---|---|---|
| **Railway** | Backend hosting | Application data, API requests, logs | US (with regional options) | SOC 2 compliant, encrypted at rest |
| **Vercel** | Frontend hosting, edge functions | Static assets, analytics metadata, request routing | Global CDN (edge) | SOC 2 compliant, encrypted in transit |
| **MongoDB Atlas** | Database hosting | All application records, email logs, audit logs | Cloud (configurable region) | Encryption at rest (AES-256), TLS in transit, SOC 2 |
| **SMTP Provider** (mail.bts-app.co.za) | Email delivery | Recipient email, email content (name, ref number, status) | South Africa | TLS on port 465 |
| **Vercel Analytics** | Web analytics | Page views, performance metrics (no PII) | Global | Privacy-focused, no cookie tracking |

### Operator agreements

Per POPIA Section 21, written agreements with each processor should stipulate:
- Personal information is processed only on the responsible party's instructions.
- Adequate security measures are maintained.
- Sub-processing requires prior authorisation.
- Data is returned or destroyed upon termination of the agreement.

**Action required**: Ensure data processing agreements (DPAs) are in place with each provider listed above.

---

## 8. Consent Management

### How consent is captured

BeMore uses a 5-step registration form. Consent is explicitly captured in **Step 5: Confirmation & Consent**:

| Step | Title | Data Collected |
|---|---|---|
| 1 | About You | firstName, surname, email, phone, companyName, userType |
| 2 | Development Readiness | Project status and readiness level |
| 3 | Funding & Partnership | Support and partnership preferences |
| 4 | Project Details | Project description and differentiators |
| 5 | Confirmation & Consent | Explicit consent acknowledgement, terms acceptance |

### Consent requirements

- Consent is captured as an explicit opt-in action during form submission.
- The consent step clearly states the purpose of data collection and processing.
- Form submission cannot proceed without completing the consent step.
- The consent record is stored as part of the `formData` field on the Application document.

### Withdrawal of consent

Data subjects may withdraw consent at any time by:
1. Requesting deletion via `POST /api/applications/data-delete` (self-service).
2. Contacting the platform administrator to request removal.

Withdrawal of consent results in permanent deletion of the application record.

### Duplicate prevention and consent

When a duplicate submission is detected (same email + userType), the system returns a 409 response with the existing reference number. No new record is created, and the original consent applies.

---

## 9. Audit Trail

### AdminAuditLog

All administrative actions are recorded in the `AdminAuditLog` collection with 7-year retention (FICA compliance). The audit trail is append-only in practice and includes:

**Logged events**:

| Action | Description |
|---|---|
| `login` | Successful admin login |
| `logout` | Admin logout |
| `login_failed` | Failed login attempt (with IP and user agent) |
| `status_update` | Application status change (e.g., new to reviewing) |
| `bulk_status_update` | Bulk status change across multiple applications |
| `data_export` | CSV data export by admin |
| `data_delete` | Application deletion (data subject request) |
| `email_reminder_sent` | Individual email reminder sent |
| `bulk_email_sent` | Bulk summit reminder emails sent |
| `settings_update` | Platform settings modified |
| `report_generated` | Analytics report generated |
| `poll_create` | New poll created |
| `poll_update` | Poll configuration updated |
| `poll_delete` | Poll deleted |
| `poll_activate` | Poll activated for live voting |
| `application_view` | Individual application viewed |
| `lead_classify` | Lead classification changed (hot/warm/cold) |

**Each audit entry records**:

- `admin.id` and `admin.email` -- who performed the action (email is redacted in logs).
- `action` -- the action type from the enum above.
- `target.model`, `target.id`, `target.refNumber` -- what was acted upon.
- `details` -- additional context (e.g., old and new status values).
- `ip` -- request IP address.
- `userAgent` -- browser/client identification.
- `requestId` -- correlation ID for request tracing.
- `status` -- success or failure.
- `errorMessage` -- error detail if the action failed.
- `timestamp` -- when the action occurred.

### Accessing the audit trail

Administrators can view the audit log at `/#/admin/audit-log` in the admin interface. The log supports filtering by action type, admin user, and date range.

---

## 10. Responsible Party Details

Per POPIA Section 1, the **responsible party** is the entity that determines the purpose and means of processing personal information.

| Field | Value |
|---|---|
| **Responsible party** | BeMore SME Access Initiative |
| **Operator** | Bukani Tech Solutions (Pty) Ltd |
| **Information Officer** | _[To be appointed -- POPIA Section 55 requires designation]_ |
| **Physical address** | _[Insert registered address]_ |
| **Email** | info@bts-app.co.za |
| **Phone** | _[Insert contact number]_ |
| **Website** | https://bemore-tawny.vercel.app |
| **Information Regulator registration** | _[Insert registration number once obtained]_ |

### Outstanding actions

- [ ] Appoint an Information Officer and register with the Information Regulator.
- [ ] Complete data processing agreements (DPAs) with all third-party processors (Section 7).
- [ ] Publish a public-facing privacy policy on the platform (linked from the registration form).
- [ ] Implement a self-service data correction endpoint (Section 3.3).
- [ ] Conduct a formal Privacy Impact Assessment (PIA) and document findings.

---

## References

- [POPIA Full Text (Government Gazette)](https://www.gov.za/documents/protection-personal-information-act)
- [Information Regulator](https://inforegulator.org.za/)
- [POPIA Conditions for Lawful Processing (Sections 8-25)](https://popia.co.za/conditions-for-lawful-processing/)
- [FICA (Financial Intelligence Centre Act, 2001)](https://www.fic.gov.za/)
