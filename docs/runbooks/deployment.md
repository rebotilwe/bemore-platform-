# Deployment Runbook — BeMore Platform

**Last updated**: 24 Apr 2026

This runbook covers staging and production deployments for the BeMore live engagement and data capture platform.

---

## 1. Environments Overview

| Environment | Frontend | Backend | Database | Branch | Auto-deploy |
|-------------|----------|---------|----------|--------|-------------|
| **Production** | `bemore-tawny.vercel.app` | `bemore-production.up.railway.app` | MongoDB Atlas | `main` | Yes |
| **Staging** | `bemorecapital.co.za` | `bemore-staging.up.railway.app` | Railway MongoDB | `staging` | Yes |

Both environments use auto-deploy: pushing to the target branch triggers deployments on Vercel (frontend) and Railway (backend) automatically.

**CI pipeline** (`.github/workflows/ci.yml`) runs on every push and PR to `main`, `develop`, and `staging`:
- Backend: `npm ci && npm test` (Jest + mongodb-memory-server)
- Frontend: `npx tsc --noEmit && npx vitest run && npm run build`
- Security: `npm audit --audit-level=critical` (non-blocking)

---

## 2. Pre-Deployment Checklist

Complete all items before merging to a deployment branch.

### Tests

```bash
# Backend (71 tests, runs sequentially with --runInBand)
cd backend && npm test

# Frontend type check + tests (43 tests)
cd frontend && npx tsc --noEmit && npx vitest run

# Frontend production build (catches build-time errors)
cd frontend && npm run build
```

### Security

```bash
cd backend && npm audit --audit-level=critical
cd frontend && npm audit --audit-level=critical
```

No critical vulnerabilities should be present. High-severity findings should be documented and tracked if not immediately fixable.

### Environment Variables

- Verify any new environment variables are added to the target environment (Railway/Vercel) **before** deploying.
- Confirm `.env.example` is updated if new variables were introduced.
- Ensure secrets (JWT_SECRET, SMTP_PASS, RESEND_API_KEY) are not committed to the repository.

### Database

- If the change introduces new Mongoose models or modifies existing schemas, verify:
  - Indexes are defined in the model (Mongoose auto-creates them on startup).
  - Existing documents are compatible with the new schema (default values, required fields).
  - TTL indexes are correct (e.g., POPIA 24-month auto-delete, 1-year tracking TTL).

---

## 3. Deploying to Staging

### Steps

1. **Merge your feature branch into `staging`**:
   ```bash
   git checkout staging
   git pull origin staging
   git merge feature/BTS-XXX-your-feature
   git push origin staging
   ```

2. **Wait for CI to pass** on GitHub Actions. Check status at the repository's Actions tab.

3. **Auto-deploy triggers**:
   - Vercel detects the push to `staging` and builds the frontend.
   - Railway detects the push to `staging` and redeploys the backend.

4. **Verify health endpoint**:
   ```bash
   curl https://bemore-staging.up.railway.app/api/health
   ```
   Expected response: `{ "status": "ok", "timestamp": "...", "uptime": ... }`

### Smoke Test Checklist

After staging deploys successfully, verify these manually:

- [ ] Health endpoint returns 200
- [ ] Public registration form loads at `/#/register`
- [ ] Form submission creates an application and returns a reference number (BM-XXXXXXXX)
- [ ] Duplicate submission (same email + userType) returns 409 with existing ref number
- [ ] Admin login works at `/#/admin/login`
- [ ] Admin dashboard loads with correct stats
- [ ] Leads page displays applications with filtering and search
- [ ] CSV export downloads without errors
- [ ] Analytics page renders charts
- [ ] Polls page: create, activate, vote, view live results (SSE)
- [ ] Settings page: toggle summit config, update Mentimeter embed ID
- [ ] Email delivery: submit a test application and confirm the confirmation email arrives
- [ ] POPIA: test data export and data delete via `/#/status`
- [ ] Site traffic page loads at `/#/admin/traffic`
- [ ] QR generator produces scannable codes at `/#/admin/qr`

---

## 4. Promoting to Production

### Steps

1. **Create a pull request**: `staging` -> `main`
   ```bash
   gh pr create --base main --head staging --title "Release: <summary>" --body "$(cat <<'EOF'
   ## What
   <Brief description of changes being promoted>

   ## Changes included
   - <list of features/fixes>

   ## Pre-deploy checklist
   - [ ] All staging smoke tests passed
   - [ ] No critical npm audit findings
   - [ ] Environment variables synced to production
   - [ ] Database compatible (no breaking schema changes)
   EOF
   )"
   ```

2. **Review the PR**:
   - Confirm CI passes on the PR.
   - Review the diff for any staging-only code (debug logs, test data, hardcoded staging URLs).
   - Verify `vercel.json` rewrites point to the correct backend for each Vercel project/environment.
   - At least one team member approves.

3. **Merge the PR** (squash merge for clean history).

4. **Auto-deploy triggers**:
   - Vercel builds and deploys `bemore-tawny.vercel.app`.
   - Railway builds and deploys `bemore-production.up.railway.app`.

### Post-Deploy Verification

- [ ] `curl https://bemore-production.up.railway.app/api/health` returns 200
- [ ] Production site loads at `https://bemore-tawny.vercel.app`
- [ ] Public form submission works end-to-end
- [ ] Admin login and dashboard load correctly
- [ ] Confirmation email sends from production SMTP/Resend
- [ ] Check Railway logs for any startup errors
- [ ] Check Vercel deployment logs for build warnings

---

## 5. Rollback Procedures

### Frontend (Vercel)

1. Go to the Vercel dashboard for the BeMore project.
2. Navigate to **Deployments**.
3. Find the last known-good deployment.
4. Click the three-dot menu and select **Promote to Production**.
5. The previous build is instantly promoted with no rebuild required.

Alternatively, via CLI:
```bash
# List recent deployments
vercel ls --scope=<team>

# Promote a specific deployment
vercel promote <deployment-url> --scope=<team>
```

### Backend (Railway)

1. Go to the Railway dashboard for the BeMore backend service.
2. Navigate to **Deployments**.
3. Find the last successful deployment.
4. Click **Redeploy** on that deployment.

Alternatively, revert the commit and push:
```bash
git revert HEAD
git push origin main
```

### Database (MongoDB)

Only required if the deployment included data migrations or destructive schema changes.

**MongoDB Atlas (Production)**:
1. Go to the Atlas dashboard.
2. Navigate to the cluster, then **Backup** > **Restores**.
3. Select the point-in-time snapshot from before the deployment.
4. Restore to the same cluster or a new cluster for verification.

**Railway MongoDB (Staging)**:
- Railway MongoDB does not provide managed backups. If a staging restore is needed, re-seed from a recent Atlas snapshot or re-run seed scripts.

**Important**: If rolling back a deployment that modified data in-flight (e.g., added a field and backfilled it), coordinate the backend rollback with the database restore to avoid schema mismatches.

---

## 6. Environment Variables Management

### Required Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000, Railway sets this automatically) |
| `NODE_ENV` | Yes | `staging` or `production` |
| `MONGODB_URI` | Yes | MongoDB connection string. App exits on startup if missing in production/staging |
| `JWT_SECRET` | Yes | 32+ character random string. App exits on startup if missing in production/staging |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `8h`) |
| `CORS_ORIGIN` | No | Comma-separated allowed origins. Uses built-in defaults if blank |
| `RESEND_API_KEY` | No | Resend API key for email delivery (preferred over SMTP) |
| `SMTP_HOST` | No | SMTP server hostname (fallback: `mail.bts-app.co.za`) |
| `SMTP_PORT` | No | SMTP port (default: `465`) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | Sender email address |
| `SMTP_FROM_NAME` | No | Sender display name (default: `BeMore Group`) |
| `PLATFORM_URL` | No | Base URL for email template links (e.g., `https://bemore-tawny.vercel.app`) |
| `ADMIN_SEED_EMAIL` | No | Email for auto-created admin account on first startup |
| `ADMIN_SEED_PASSWORD` | No | Password for auto-created admin account |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000 / 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

### Adding/Updating Variables in Railway

1. Go to the Railway dashboard > select the BeMore backend service.
2. Navigate to the **Variables** tab.
3. Click **New Variable** or edit an existing one.
4. Enter the key and value. Railway encrypts secrets at rest.
5. Click **Save**. Railway automatically redeploys the service when variables change.

**Tip**: Use Railway's **Shared Variables** for values common across services. Use **Service Variables** for service-specific secrets.

### Adding/Updating Variables in Vercel

1. Go to the Vercel dashboard > select the BeMore frontend project.
2. Navigate to **Settings** > **Environment Variables**.
3. Add the variable, selecting which environments it applies to (Production, Preview, Development).
4. Click **Save**. The variable takes effect on the next deployment.

**Note**: Frontend environment variables must be prefixed with `VITE_` to be accessible in client-side code. Backend variables are managed in Railway, not Vercel.

---

## 7. Monitoring After Deploy

### Health Endpoint

Immediately after deploy, confirm the backend is running:

```bash
# Production
curl -s https://bemore-production.up.railway.app/api/health | jq .

# Staging
curl -s https://bemore-staging.up.railway.app/api/health | jq .
```

Expected: `{ "status": "ok", "timestamp": "...", "uptime": ... }`

### Railway Logs

1. Open the Railway dashboard > BeMore backend service.
2. Click the **Logs** tab (or **Deployments** > select the latest > **View Logs**).
3. Look for:
   - `MongoDB connected` on startup.
   - `Admin seed` message (only on first run or if no admins exist).
   - Any `error` or `warn` level log entries.
   - Unhandled rejection / uncaught exception handlers firing.

Via CLI:
```bash
railway logs --service bemore-backend
```

### Vercel Deployment Logs

1. Open the Vercel dashboard > BeMore project.
2. Click the latest deployment.
3. Review the **Build Logs** for warnings or errors.
4. Check **Runtime Logs** (if enabled) for serverless function errors (applies to Vercel rewrites/proxied API calls).

### Error Rate Monitoring

- **Vercel Analytics**: Available at `https://bemore-tawny.vercel.app` via `@vercel/analytics` (integrated in `frontend/src/main.ts`). Check Web Vitals and page view trends.
- **Vercel Speed Insights**: Integrated via `@vercel/speed-insights`. Monitor LCP, FID, CLS regressions after deploy.
- **Backend logs**: Winston structured logging outputs JSON in production. Monitor for `level: "error"` entries in Railway logs.
- **Email delivery**: Check the `EmailLog` collection for `status: "failed"` entries after deploy.

### Ongoing Checks (First 30 Minutes)

- [ ] No spike in error-level logs
- [ ] Health endpoint still responding after 5, 15, and 30 minutes
- [ ] At least one successful form submission processes end-to-end
- [ ] SSE connections (poll live results) establish without errors
- [ ] No CORS errors in browser console on production domain

---

## 8. Emergency Hotfix Process

Use this process for critical production issues (P1/P2) that cannot wait for the normal staging flow.

### Steps

1. **Create a hotfix branch from `main`**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/BTS-XXX-brief-description
   ```

2. **Implement the fix**:
   - Keep changes minimal and focused on the issue.
   - Add or update tests to cover the fix.
   - Run the full test suite locally:
     ```bash
     cd backend && npm test
     cd frontend && npx tsc --noEmit && npx vitest run
     ```

3. **Create a PR directly to `main`**:
   ```bash
   gh pr create --base main --head hotfix/BTS-XXX-brief-description \
     --title "hotfix: <brief description>" \
     --body "## Emergency Fix

   **Issue**: <describe the production issue>
   **Root cause**: <what went wrong>
   **Fix**: <what this change does>

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Verified fix locally
   - [ ] Smoke tested critical paths"
   ```

4. **Get expedited review** (minimum one approval) and merge.

5. **Verify production** using the post-deploy checklist in section 4.

6. **Backport to staging**:
   ```bash
   git checkout staging
   git pull origin staging
   git merge main
   git push origin staging
   ```

### Hotfix Communication

- Notify the team in the designated channel before merging a hotfix.
- After resolution, create a post-mortem for P1 incidents within 48 hours (see incident response protocol in CLAUDE.md).
- Track the hotfix ticket to ensure the root cause is addressed in a follow-up.
