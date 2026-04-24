# Security Policy

Bukani Tech Solutions (BTS) takes the security of BeMore and the personal data it handles seriously. BeMore is a live engagement and data capture platform serving South African property developers, landowners, investors, students, and professionals. Compliance with the Protection of Personal Information Act (POPIA) is mandatory across all components of the platform.

All security vulnerabilities should be reported responsibly using the process outlined below.

---

## Reporting a Vulnerability

**Email**: security@bts-app.co.za

Please do **NOT** create public GitHub issues for security vulnerabilities. Public disclosure before a fix is available puts all users at risk.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce the issue
- The affected component (frontend, backend, API endpoint, infrastructure)
- An assessment of the potential impact (data exposure, privilege escalation, denial of service, etc.)
- Any suggested remediation, if applicable

### Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Acknowledgment of report | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix deployed (critical) | Within 24 hours of confirmation |
| Fix deployed (high severity) | Within 1 week of confirmation |

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main` branch) | Yes |
| Staging (`develop` branch) | Yes |
| Older releases | No |

Only the latest production and staging deployments receive security updates. Users and administrators should always run the most recent version.

---

## Security Measures in Place

### Authentication and Authorization

- **JWT authentication** with httpOnly cookies for session management
- **CSRF token protection** on all mutating endpoints
- Admin routes protected by JWT middleware with role verification
- Admin audit logging for all privileged operations

### Transport and Header Security

- **Encrypted transport** via HTTPS/TLS on all environments
- **Helmet security headers** including X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, and Permissions-Policy
- **Content Security Policy (CSP)** headers to mitigate code injection attacks
- **CORS** restricted to an explicit origin allowlist (no wildcard)

### Input Validation and Injection Prevention

- **Input validation** using express-validator on all API endpoints
- **XSS protection** through HTML escaping and CSP enforcement
- **NoSQL injection prevention** via input sanitization and Mongoose schema enforcement
- **Formula injection prevention** in CSV exports (cells starting with `=`, `+`, `-`, `@` are prefixed)
- **Settings whitelist** enforcement on admin configuration endpoints
- **Poll updates** use whitelist-based field assignment to prevent prototype pollution

### Rate Limiting

Five tiers of rate limiting protect against abuse:

| Tier | Limit | Scope |
|------|-------|-------|
| Health | 200 requests/min | Health check endpoint |
| Public | 100 requests/15 min | Public-facing endpoints |
| Admin | 300 requests/15 min | Authenticated admin endpoints |
| Auth | 10 requests/15 min | Login and authentication |
| Vote | 60 requests/15 min | Poll voting |

### Logging and Monitoring

- **Structured logging** via Winston (no `console.log` in production)
- **PII redaction** applied automatically before logging (POPIA requirement)
- **Admin audit log** tracks privileged actions with timestamps and user context
- **Error handler** sanitized to prevent leaking internal details (e.g., Mongoose CastError values)

---

## Security Update Policy

| Severity | Response Time |
|----------|---------------|
| Critical (active exploitation, data breach risk) | Patch deployed within 24 hours |
| High (significant vulnerability, no known exploit) | Patch deployed within 1 week |
| Medium / Low | Addressed in the next scheduled release |

### Dependency Management

- `npm audit` is run monthly on both frontend and backend
- CI pipeline includes a security scan step (`npm audit --audit-level=critical`) on every PR and push to `main` or `develop`
- Critical dependency vulnerabilities are patched within 24 hours; high severity within 1 week

---

## Data Protection (POPIA)

BeMore handles personal information of South African residents and is subject to the Protection of Personal Information Act (POPIA). The following measures are in place:

- **Encryption in transit**: All personal data is transmitted over HTTPS/TLS
- **PII auto-redaction**: Email addresses, phone numbers, SA ID numbers, and other PII are automatically redacted from application logs
- **Data subject rights**: Public API endpoints allow applicants to export or permanently delete their personal data using their reference number and email address (`POST /api/applications/data-export` and `POST /api/applications/data-delete`)
- **Data retention**: A 24-month TTL (time-to-live) index ensures automatic expiry of personal data after the retention period
- **Minimal data collection**: Only information necessary for the platform's purpose is collected
- **Consent**: Explicit consent is captured during the multi-step application form

For the full POPIA compliance framework, see `docs/compliance/popia.md`.

---

## Responsible Disclosure

Bukani Tech Solutions is committed to working with security researchers and the broader community to keep BeMore and its users safe.

- We will **acknowledge receipt** of your vulnerability report within **48 hours**
- We will provide an **initial assessment** within **7 days**
- We will **not take legal action** against individuals who report vulnerabilities in good faith and follow this responsible disclosure process
- We will **credit reporters** (if desired) in the security fix or release notes
- We ask that you **do not access, modify, or delete** user data beyond what is necessary to demonstrate the vulnerability
- We ask that you **allow reasonable time** for a fix before any public disclosure

---

## Contact

For security concerns: **security@bts-app.co.za**

For general inquiries: **info@bts-app.co.za**
