# Release Management

**Last updated**: 24 Apr 2026

This document describes the release process, versioning strategy, and rollback procedures for the BeMore platform.

---

## 1. Release Process Overview

BeMore follows a **git-driven deployment model** with no manual deploy steps. Every merge to a target branch triggers an automatic deployment.

```
Feature branch ──► staging branch ──► main branch
                   (staging env)       (production env)
```

1. Developers build and test features on feature branches.
2. Feature branches merge into `staging` for integration testing.
3. Once validated, `staging` is promoted to `main` via pull request.
4. Merging to `main` auto-deploys to production (Vercel + Railway).

### Environments

| Environment | Frontend (Vercel) | Backend (Railway) | Branch |
|-------------|-------------------|-------------------|--------|
| **Staging** | bemorecapital.co.za | bemore-staging.up.railway.app | `staging` |
| **Production** | bemore-tawny.vercel.app | bemore-production.up.railway.app | `main` |

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs automatically on PR/push to `main`, `develop`, and `staging`:

1. **Backend Tests** -- `npm ci` + `npm test` (Jest, Node 20, ubuntu, coverage artifact)
2. **Frontend Tests** -- `tsc --noEmit` + `vitest run` + `npm run build`
3. **Security Scan** -- `npm audit --audit-level=critical` on both packages (non-blocking)

---

## 2. Version Numbering

BeMore uses **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

| Component | When to increment | Examples |
|-----------|-------------------|----------|
| **MAJOR** | Breaking API changes, major feature overhauls, database schema changes requiring migration | Restructuring the Application model, removing a public API endpoint |
| **MINOR** | New features, non-breaking API additions, new admin pages | Adding polls system, adding traffic analytics, new report type |
| **PATCH** | Bug fixes, security patches, minor improvements, styling tweaks | Fixing CSP headers, correcting date formatting, updating dependencies |

Version tags are applied to git after each production release (see step 7 in the workflow below).

---

## 3. Release Workflow

### Step 1: Feature Complete on Staging

All features for the release are merged into the `staging` branch and deployed to the staging environment. Verify functionality at:

- Frontend: https://bemorecapital.co.za
- Backend: https://bemore-staging.up.railway.app/api/health

### Step 2: Run Full Test Suite

```bash
# Backend tests (71 tests)
cd backend && npm test

# Frontend typecheck
cd frontend && npm run typecheck

# Frontend tests (43 tests)
cd frontend && npx vitest run
```

All tests must pass. No skipped or pending tests allowed in a release.

### Step 3: Create PR (staging to main)

Create a pull request from `staging` to `main` with release notes in the PR description. Use the release notes template from section 6.

```bash
gh pr create --base main --head staging \
  --title "Release v1.X.X" \
  --body "$(cat <<'EOF'
## v1.X.X -- YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Security
- ...
EOF
)"
```

### Step 4: Code Review and Approval

- At least one reviewer must approve the PR.
- CI checks must pass (backend tests, frontend tests, typecheck, security scan).
- Review the diff for any hardcoded secrets, missing error handling, or POPIA concerns.

### Step 5: Merge to Main

Merge the PR using **squash merge** for a clean production history. This triggers automatic deployment:

- Vercel detects the push to `main` and deploys the frontend.
- Railway detects the push to `main` and deploys the backend.

### Step 6: Verify Production Health

After deployment completes (typically 1-3 minutes):

1. Check backend health: `curl https://bemore-production.up.railway.app/api/health`
2. Load the frontend: https://bemore-tawny.vercel.app
3. Verify key flows: public form submission, admin login, dashboard data loading.
4. Check Railway logs for startup errors.
5. Check Vercel deployment status in the dashboard.

### Step 7: Tag the Release

```bash
git checkout main
git pull origin main
git tag -a v1.X.X -m "Release v1.X.X"
git push origin v1.X.X
```

---

## 4. Release Checklist

Before merging a release PR, confirm every item:

- [ ] All features tested on staging environment
- [ ] Backend tests pass (`npm test` -- 71 tests)
- [ ] Frontend tests pass (`npx vitest run` -- 43 tests)
- [ ] Frontend typecheck passes (`npm run typecheck`)
- [ ] No critical or high `npm audit` findings in backend or frontend
- [ ] Environment variables synced (if new variables were added to staging, add them to production Railway/Vercel before merging)
- [ ] Database schema compatible (no breaking Mongoose model changes without migration plan)
- [ ] POPIA compliance verified for any new data collection fields
- [ ] Performance tested (no regression in page load or API response times)
- [ ] Email templates render correctly (if mailer changes were made)
- [ ] Rate limiting configuration reviewed (if new endpoints were added)
- [ ] Rollback plan documented (see section 7)
- [ ] Release notes written in PR description

---

## 5. Hotfix Process

Hotfixes bypass the staging validation cycle for critical production issues.

### Workflow

1. **Branch from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/BTS-{ticket}-{description}
   ```

2. **Implement the fix** with tests covering the bug.

3. **Run the test suite**:
   ```bash
   cd backend && npm test
   cd frontend && npm run typecheck && npx vitest run
   ```

4. **Create PR to main**:
   ```bash
   gh pr create --base main --head hotfix/BTS-{ticket}-{description} \
     --title "fix: {description}" \
     --body "Hotfix for production issue BTS-{ticket}"
   ```

5. **Review, approve, and merge**. Auto-deploys to production.

6. **Backport to staging** to keep branches in sync:
   ```bash
   git checkout staging
   git pull origin staging
   git cherry-pick <hotfix-commit-hash>
   git push origin staging
   ```
   Alternatively, open a PR from `main` to `staging` if cherry-pick causes conflicts.

7. **Tag as a patch release**: `git tag -a v1.X.Y -m "Hotfix v1.X.Y"`

---

## 6. Release Notes Template

Use this format in PR descriptions and git tag annotations:

```
## v1.X.X -- YYYY-MM-DD

### Added
- New feature or capability

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes

### Security
- Security improvements or vulnerability patches

### Breaking Changes
- Changes that require action from consumers (API changes, env var changes, etc.)
```

Example:

```
## v1.3.0 -- 2026-04-24

### Added
- Live polling system with SSE real-time results
- Site traffic analytics dashboard with form funnel tracking
- QR code generator for engagement source tracking

### Changed
- Upgraded rate limiting to 5 tiers (health, public, admin, auth, vote)
- Admin dashboard redesigned with card-based layout

### Fixed
- CSP headers now allow font downloads
- Date aggregations use Africa/Johannesburg timezone consistently
- Mongoose CastError no longer leaks raw values in error responses

### Security
- Poll update endpoint uses whitelist-based field assignment (prevents prototype pollution)
- CSV export sanitizes formula injection patterns

### Breaking Changes
- None
```

---

## 7. Rollback Procedure

If a production deployment introduces a critical issue, roll back immediately and investigate afterward.

### Frontend Rollback (Vercel)

1. Open the Vercel dashboard for the BeMore project.
2. Navigate to **Deployments**.
3. Find the previous stable production deployment.
4. Click the three-dot menu and select **Promote to Production**.
5. The previous build is live within seconds -- no rebuild required.

### Backend Rollback (Railway)

1. Open the Railway dashboard for the BeMore production service.
2. Navigate to **Deployments**.
3. Find the previous successful deployment.
4. Click **Redeploy** on that deployment.
5. Railway rebuilds and deploys from the previous commit.

Alternatively, revert the merge commit in git:

```bash
git checkout main
git revert -m 1 <merge-commit-hash>
git push origin main
```

This triggers a new deployment with the reverted code.

### Database Rollback

If the release included data model changes that corrupted or altered data:

1. **Identify the scope**: Determine which collections and documents are affected.
2. **Restore from MongoDB Atlas backup**: Use Atlas point-in-time restore to recover data to a state before the deployment.
3. **Verify data integrity**: Run application health checks and spot-check affected records.
4. **Coordinate with code rollback**: Ensure the running code version matches the restored schema.

> **Important**: Mongoose schema changes in BeMore are additive (new fields with defaults). Avoid removing or renaming fields without a dedicated migration plan and ADR.

### Post-Rollback Actions

1. Notify the team that a rollback occurred and why.
2. Create a ticket for the root cause investigation.
3. Write a brief post-mortem (see incident response procedures in the global CLAUDE.md).
4. Fix the issue on a branch, validate on staging, and re-release following the standard workflow.
