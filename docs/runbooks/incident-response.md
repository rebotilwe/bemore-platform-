# Incident Response Runbook — BeMore Platform

**Last updated**: 24 Apr 2026
**Platform**: BeMore SME Access Initiative
**Infrastructure**: Railway (backend) | Vercel (frontend) | MongoDB Atlas (production) | MongoDB on Railway (staging)
**Production URL**: https://bemore-tawny.vercel.app
**Backend URL**: https://bemore-production.up.railway.app

---

## 1. Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **P1 — Critical** | Service down, data loss, security breach | 15 min | Production outage, MongoDB unreachable, data leak, JWT secret compromised |
| **P2 — High** | Major feature broken, significant user impact | 1 hour | Login failures for all users, form submissions returning 500, bulk status updates failing |
| **P3 — Medium** | Minor feature broken, workaround exists | 4 hours | Analytics dashboard not loading, email delivery delayed, poll SSE disconnects, CSV export timing out |
| **P4 — Low** | Cosmetic, minor inconvenience | Next business day | Typo in UI text, minor styling issue, non-critical log noise |

---

## 2. Detection

### Automated Monitoring

| Source | What it detects | Alert channel |
|--------|----------------|---------------|
| **Health endpoint** (`GET /api/health`) | Backend availability, MongoDB connection status | Uptime monitor (poll every 60s) |
| **Railway alerts** | Service crashes, high memory/CPU, deploy failures | Railway dashboard + email |
| **Vercel deployment alerts** | Build failures, edge function errors | Vercel dashboard + email |
| **Error rate spikes** | Winston error logs, unhandled rejections | Railway log drain |
| **MongoDB Atlas alerts** | Connection pool exhaustion, slow queries, storage limits | Atlas dashboard + email |

### Manual Checks

- **Backend health**: `curl https://bemore-production.up.railway.app/api/health`
- **Frontend reachable**: Load `https://bemore-tawny.vercel.app` and verify the hero page renders
- **Database connectivity**: Check Railway logs for `MongoDB connected` on service startup
- **Rate limit status**: Monitor 429 responses in Railway logs

### Key Metrics to Watch

- API response times (p95 should be under 500ms)
- MongoDB connection count (Atlas free tier: max 500)
- Error rate (target: less than 0.1% of requests)
- Form submission success rate
- Email delivery rate (check `EmailLog` collection for `failed` status)

---

## 3. Response Procedure

### Step 1 — Detect

An incident is detected through monitoring alerts, user reports, or manual observation. Log the detection time immediately.

### Step 2 — Acknowledge

- Assign an incident commander within the response time SLA for the severity level.
- Create an incident record with: title, severity, detection time, initial symptoms.
- If P1/P2, immediately notify stakeholders (see Escalation Matrix).

### Step 3 — Communicate

- Update the status page or communication channel with initial assessment.
- Use the communication templates below.
- Set expectations for next update (every 15 min for P1, every 30 min for P2).

### Step 4 — Mitigate

Restore service as quickly as possible. Mitigation takes priority over root cause analysis.

- **Rollback** to last known good deployment if the incident was caused by a code change.
- **Feature flag off** or disable the broken feature if possible (e.g., disable polls via `polls_enabled` setting).
- **Scale up** if the issue is resource exhaustion.
- **Restart** the Railway service if the process is stuck.

### Step 5 — Resolve

Deploy the root cause fix after mitigation stabilizes the service.

- Verify the fix in staging before production.
- Monitor for 30 minutes after deploy to confirm resolution.
- Confirm with the reporter (if user-reported) that the issue is resolved.

### Step 6 — Review

- P1/P2: Post-mortem within 48 hours.
- P3: Post-mortem within 1 week.
- P4: No post-mortem required; log the fix in the commit message.

---

## 4. Communication Templates

### Status Update Template

```
[BeMore Platform — Incident Update]

Status: Investigating | Identified | Monitoring | Resolved
Severity: P1 / P2 / P3 / P4
Component: Backend API / Frontend / Database / Authentication / Email

Summary:
<Brief description of the issue and user impact>

Current Actions:
<What is being done right now>

Next Update:
<Expected time of next update>

— BeMore Engineering Team
```

### Stakeholder Email Template

```
Subject: [P<N>] BeMore Platform Incident — <Short Description>

Hi team,

We are currently experiencing an issue with the BeMore platform.

What is happening:
<Description of symptoms and user impact>

Who is affected:
<All users / admin users / specific user types / form submissions>

What we are doing:
<Current mitigation steps>

Estimated resolution:
<Time estimate or "investigating">

We will provide updates every <15 min / 30 min / 1 hour>.

— <Incident Commander Name>
   BeMore Engineering Team
```

---

## 5. Common Incident Playbooks

### 5.1 Backend Down (Railway)

**Symptoms**: Health endpoint returns non-200, frontend falls back to demo mode, API calls fail.

1. **Check Railway dashboard**: Open https://railway.app — look for deploy failures, crash loops, or resource limits.
2. **Check logs**: Look for `unhandledRejection`, `uncaughtException`, or MongoDB connection errors in Railway logs.
3. **Restart the service**: Use Railway dashboard to restart. The backend has graceful shutdown handlers and MongoDB retry logic (3 attempts with exponential backoff).
4. **Rollback**: If the issue started after a deploy, promote the previous deployment in Railway.
5. **Verify recovery**: `curl https://bemore-production.up.railway.app/api/health` — expect `{"status":"ok"}`.
6. **Check environment variables**: Ensure `MONGODB_URI`, `JWT_SECRET`, `PORT` are set. The app exits on startup if `JWT_SECRET` or `MONGODB_URI` are missing in production.

### 5.2 Frontend Broken (Vercel)

**Symptoms**: White screen, JavaScript errors in console, broken routing.

1. **Check Vercel dashboard**: Open https://vercel.com — look for build failures or edge function errors.
2. **Promote previous deployment**: In Vercel dashboard, find the last successful deployment and promote it to production. This takes effect immediately.
3. **Check build logs**: If the latest build failed, review the build output for TypeScript errors (`tsc --noEmit` runs during build).
4. **Verify**: Load `https://bemore-tawny.vercel.app` and confirm the hero page renders. Check that `/#/admin/login` loads the login form.
5. **Cache issues**: Vercel serves hashed assets with immutable cache headers. If users see stale content, the service worker (v2) should handle revalidation. Advise users to hard-refresh (`Ctrl+Shift+R`).

### 5.3 Database Unreachable

**Symptoms**: API returns 500 errors, health endpoint reports database down, logs show `MongoServerSelectionError`.

1. **Check MongoDB Atlas status**: Visit https://status.cloud.mongodb.com/ for Atlas outages.
2. **Check Railway status**: If using Railway-hosted MongoDB (staging), check Railway dashboard.
3. **Verify connection string**: Ensure `MONGODB_URI` in Railway environment variables is correct and the password has not been rotated.
4. **Check IP allowlist**: Atlas requires IP allowlisting. Verify that Railway's outbound IPs are allowed (or use `0.0.0.0/0` for Railway's dynamic IPs).
5. **Check connection pool**: Atlas free/shared tier limits connections to 500. If the pool is exhausted, restart the backend to release connections.
6. **Retry behavior**: The backend retries MongoDB connections 3 times with exponential backoff (2s, 4s, 8s). If all retries fail, the process logs the error but does not exit — it will serve errors until the database recovers.
7. **Failover**: If Atlas is in an extended outage, the frontend automatically falls back to demo mode (localStorage) for public users. Admin features will be unavailable.

### 5.4 Authentication Failures

**Symptoms**: Admin login returns 401, JWT verification fails, `/api/auth/verify` rejects valid tokens.

1. **Check `JWT_SECRET`**: Ensure the environment variable has not changed. If it was rotated, all existing tokens are invalidated — this is expected behavior.
2. **Check token expiry**: Default `JWT_EXPIRES_IN` is `8h`. If admins report being logged out, verify this value has not been reduced.
3. **Check admin seed**: On startup, the backend seeds a default admin using `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`. Verify these are set correctly.
4. **Rate limiting**: Auth endpoints have a strict rate limit (10 requests per 15 minutes). If an admin is locked out, wait 15 minutes or restart the service to reset the rate limiter (in-memory store).
5. **Clock skew**: JWT validation is sensitive to server clock. Railway containers should have accurate time, but verify if the issue is intermittent.
6. **Manual fix**: Connect to MongoDB and verify the `admins` collection has the expected admin document. Use `bcryptjs` to verify the password hash matches.

### 5.5 High Error Rate

**Symptoms**: Spike in 500 responses, increased error-level logs, slow response times.

1. **Check rate limits**: Review Railway logs for 429 responses. The platform has 5 rate limit tiers (health: 200/min, public: 100/15min, admin: 300/15min, auth: 10/15min, vote: 60/15min).
2. **Check database performance**: Look for slow query warnings in MongoDB Atlas. Common culprits: unindexed queries on `applications` collection, large aggregation pipelines in analytics endpoints.
3. **Check external services**: Email delivery depends on the Resend HTTPS API (`api.resend.com`). If Resend is down, `sendSubmissionConfirmation` and the POPIA receipt sends will fail but should not block form submissions (email is fire-and-forget). SMTP fallback was removed 2026-05-11.
4. **Check memory/CPU**: Railway dashboard shows resource usage. If the Node.js process is running out of memory, consider increasing the Railway plan or optimizing the offending endpoint.
5. **Identify the endpoint**: Filter Railway logs by HTTP status 500. Common patterns:
   - `/api/applications` — database query timeout
   - `/api/analytics/*` — heavy aggregation pipeline
   - `/api/polls/:id/live` — SSE connection buildup
6. **Temporary mitigation**: If a specific endpoint is causing cascading failures, consider restarting the service to clear in-flight requests and reset connection pools.

### 5.6 Data Breach (POPIA Compliance)

**Symptoms**: Unauthorized data access detected, credentials leaked, PII exposed in logs or responses.

**This is always P1 — Critical.**

1. **Contain immediately**:
   - Rotate `JWT_SECRET` to invalidate all sessions.
   - Rotate `RESEND_API_KEY` (via the Resend dashboard) if email credentials are compromised.
   - Rotate MongoDB credentials and update `MONGODB_URI` if database access is compromised.
   - If the breach is through the API, enable maintenance mode or take the backend offline.

2. **Assess scope**:
   - Determine what data was accessed (applications contain PII: names, emails, phone numbers, company names).
   - Check `AdminAuditLog` for unauthorized admin actions.
   - Review Railway logs for suspicious request patterns (unusual IPs, bulk data access).
   - Determine the time window of unauthorized access.

3. **Preserve evidence**:
   - Export Railway logs for the incident period.
   - Take a snapshot of the MongoDB database.
   - Do not modify or delete any data until the investigation is complete.

4. **Notify the Information Regulator (POPIA requirement)**:
   - Under POPIA Section 22, the responsible party must notify the Information Regulator and affected data subjects "as soon as reasonably possible" after discovering a breach.
   - Contact: https://www.justice.gov.za/inforeg/
   - Include: nature of the breach, categories of data subjects affected, possible consequences, measures taken.

5. **Notify affected data subjects**:
   - Use the `EmailLog` and `Application` collections to identify affected users.
   - Send notification emails describing what data was exposed and what steps users should take.

6. **Remediate**:
   - Fix the vulnerability that allowed the breach.
   - Review and strengthen access controls.
   - Conduct a full security audit of the codebase.
   - Update the privacy policy if necessary.

---

## 6. Post-Mortem Template

```markdown
# Incident Post-Mortem: <Title>

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Severity**: P1 / P2 / P3
**Incident Commander**: <Name>

## Impact

<Number of users affected, features impacted, data implications, revenue/reputation impact>

## Timeline (all times in SAST, UTC+2)

| Time | Event |
|------|-------|
| HH:MM | <Detection — how was the incident discovered> |
| HH:MM | <Acknowledgement — who responded> |
| HH:MM | <Key diagnostic steps and findings> |
| HH:MM | <Mitigation applied — what was done to restore service> |
| HH:MM | <Resolution — root cause fix deployed> |
| HH:MM | <Monitoring confirmed — service stable> |

## Root Cause

<Technical explanation of what broke and why. Be specific — include code paths,
configuration values, or infrastructure details as relevant.>

## Resolution

<What was done to fix the root cause. Include PR/commit references if applicable.>

## What Went Well

- <Things that helped detect or resolve the incident quickly>

## What Could Be Improved

- <Gaps in monitoring, documentation, or process>

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| <Preventive measure> | <Name> | YYYY-MM-DD | Open |
| <Monitoring improvement> | <Name> | YYYY-MM-DD | Open |
| <Documentation update> | <Name> | YYYY-MM-DD | Open |
```

---

## 7. Escalation Matrix

| Severity | First Responder | Escalate To (if unresolved in SLA) | Executive Notification |
|----------|----------------|-----------------------------------|-----------------------|
| **P1 — Critical** | On-call engineer | Engineering lead (15 min) | CTO + stakeholders (30 min) |
| **P2 — High** | On-call engineer | Engineering lead (1 hour) | CTO (2 hours) |
| **P3 — Medium** | Assigned engineer | Engineering lead (next standup) | Not required |
| **P4 — Low** | Assigned engineer | Not required | Not required |

### Contact List (update with actual contacts)

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Engineering Lead | `<TBD>` | `<TBD>` | `<TBD>` |
| CTO | `<TBD>` | `<TBD>` | `<TBD>` |
| DevOps / Infrastructure | `<TBD>` | `<TBD>` | `<TBD>` |
| Database Administrator | `<TBD>` | `<TBD>` | `<TBD>` |
| POPIA Information Officer | `<TBD>` | `<TBD>` | `<TBD>` |

---

## 8. Recovery Targets

| Service Tier | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) | Examples |
|-------------|-------------------------------|-------------------------------|----------|
| **Critical** | 15 min | 0 (no data loss) | Authentication, form submissions, database |
| **Core** | 1 hour | 5 min | Admin dashboard, analytics, leads management |
| **Supporting** | 4 hours | 1 hour | Reports, email notifications, CSV exports, polls |

### Recovery Procedures by Tier

**Critical tier (15 min RTO)**:
- Backend restart or rollback on Railway (under 5 min).
- MongoDB Atlas has automatic failover for replica sets (under 30s for M10+).
- Frontend promotes previous Vercel deployment (under 2 min).
- JWT secret rotation and admin re-seed (under 10 min).

**Core tier (1 hour RTO)**:
- Analytics aggregation pipelines can be rebuilt from raw `Application` data.
- Admin dashboard is stateless; recovery is automatic once the backend is restored.
- Leads page data is read from MongoDB; no separate cache to rebuild.

**Supporting tier (4 hours RTO)**:
- Email delivery depends on the Resend HTTPS API (sole provider as of 2026-05-11). Failed sends are logged to `EmailLog` with `failed` status and an error string prefixed `Resend …`; sends are fire-and-forget and never block API responses.
- Reports are computed on-the-fly from `Application` data; no pre-computed state to recover.
- Poll SSE connections will auto-reconnect on the client side.
- CSV exports can be re-triggered by admin users.

---

## 9. Useful Commands

```bash
# Check backend health
curl -s https://bemore-production.up.railway.app/api/health | jq .

# Check frontend is serving (returns HTML)
curl -s -o /dev/null -w "%{http_code}" https://bemore-tawny.vercel.app

# Local backend startup (for testing fixes before deploy)
cd backend && npm run dev

# Run backend tests to verify a fix
cd backend && npm test

# Run frontend type check
cd frontend && npm run typecheck

# Check MongoDB connection locally
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Count recent errors in applications collection
mongosh "$MONGODB_URI" --eval "db.applications.countDocuments({createdAt: {\$gte: new Date(Date.now() - 3600000)}})"

# Check email log for failures
mongosh "$MONGODB_URI" --eval "db.emaillogs.find({status: 'failed'}).sort({createdAt: -1}).limit(10).pretty()"
```

---

## 10. Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-24 | BTS Engineering | Initial version |
