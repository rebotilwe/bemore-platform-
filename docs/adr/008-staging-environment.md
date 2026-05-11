# ADR-008: Separate Staging Environment with Railway MongoDB

## Status

Accepted

## Date

2026-04-24

## Context

As the BeMore platform matured beyond the initial summit event and moved toward ongoing engagement and deal room operations, the need for a proper staging environment became critical. Previously, changes were tested locally and deployed directly to production, creating risk of regressions and downtime during the summit.

Key requirements for the staging environment:

- Feature branches must be testable in a production-like environment before merging to `main`.
- The staging environment must be isolated from production data — no risk of accidentally modifying live applications, poll results, or analytics data.
- Stakeholders (BeMore team, PBSA partners) need a preview URL to review features before they go live.
- The staging database must be disposable — it should be safe to reset or seed with test data at any time.
- Cost must be kept low. A full Atlas cluster for staging would double the database hosting cost.

Alternatives considered:

- **MongoDB Atlas staging cluster**: Operational parity with production, but adds monthly cost (minimum M10 at ~$57/month for a dedicated staging cluster) and another Atlas project to manage.
- **Shared Atlas cluster with separate database**: Lower cost but shared resources. A misbehaving staging query could affect production performance on a shared cluster.
- **Local MongoDB only**: No cost, but not accessible to stakeholders for preview, and not representative of deployment conditions.
- **Railway MongoDB plugin**: Railway offers a MongoDB plugin that provisions a database alongside the backend service. Included in Railway usage-based pricing, managed through the same dashboard as the backend.

## Decision

Deploy the staging environment as follows:

- **Frontend**: Vercel auto-deploy from the `staging` branch, served at `bemorecapital.co.za`.
- **Backend**: Separate Railway service (`bemore-staging`), deployed from the `staging` branch.
- **Database**: Railway MongoDB plugin, accessible internally at `mongodb.railway.internal:27017/bemore_staging`.
- **Branch strategy**: Feature branches are PR'd against `staging`. After stakeholder review on the staging URL, changes are promoted to `main` for production deployment.
- **Environment**: `NODE_ENV=staging` with the same environment variable validation as production (requires `JWT_SECRET`, `MONGODB_URI`).

The staging environment enforces the same security and validation rules as production but uses:
- A separate JWT secret (staging tokens cannot authenticate against production).
- A separate Resend API key (or unset to disable email sending and avoid messaging real applicants from staging). SMTP fallback was removed 2026-05-11.
- A disposable database that can be reset without consequence.

## Consequences

### Positive

- Complete isolation from production data. Staging writes cannot affect live applications, and staging credentials cannot access production.
- Cost-effective: Railway MongoDB is included in Railway's usage-based pricing, avoiding a separate Atlas bill for staging.
- Single dashboard: both the staging backend and staging database are managed in Railway, simplifying operations.
- Stakeholder preview: the `bemorecapital.co.za` domain gives partners a stable URL to review features before production release.
- CI/CD integration: GitHub Actions runs on pushes to `staging`, and Vercel auto-deploys the frontend from the `staging` branch.
- Disposable database: staging data can be reset or seeded freely for testing scenarios (e.g., load testing, edge cases).

### Negative

- Railway MongoDB and MongoDB Atlas have different operational characteristics. Railway MongoDB is a single-node deployment without Atlas features (automated backups, performance advisor, point-in-time recovery, full-text search indexes). Bugs related to Atlas-specific behaviour may not surface in staging.
- Railway MongoDB does not support MongoDB Atlas Search or Atlas triggers. If these features are adopted in production, they cannot be tested in staging.
- Two Railway services to manage (production + staging), each with their own environment variables, logs, and monitoring.
- The staging database accumulates stale test data over time. Periodic cleanup or automated seeding scripts are needed.

### Risks

- **Operational parity gap**: A bug that manifests only under Atlas's replica set configuration (e.g., write concern behaviour, read preference routing) would not be caught in staging. Critical data operations should be verified against a production-like Atlas environment before major releases.
- **Railway MongoDB durability**: Railway MongoDB does not provide the same durability guarantees as Atlas (no automated backups, no multi-region replication). This is acceptable for staging but reinforces that staging data is disposable and not a backup of production.
- **Domain confusion**: Users or stakeholders may accidentally use the staging URL (`bemorecapital.co.za`) as if it were production. Clear visual differentiation (staging banner, different colour scheme) should be added to prevent this.
- **Environment drift**: If environment variables or configuration diverge between staging and production, bugs may only appear in one environment. A checklist or automated comparison of environment variable keys (not values) between staging and production would mitigate this.
