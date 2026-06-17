# Backup & Recovery Runbook -- BeMore Platform

**Owner**: Bukani Tech Solutions DevOps
**Last updated**: 24 Apr 2026
**Environments**: Production (MongoDB Atlas), Staging (Railway MongoDB)

---

## 1. Backup Strategy Overview

| Data Type | Frequency | Retention | Storage | Method |
|-----------|-----------|-----------|---------|--------|
| Atlas DB (full) | Daily (Atlas automated) | 30 days | Atlas cloud | Atlas continuous backup |
| Atlas DB (on-demand) | Before major releases | 90 days | Atlas snapshots | Atlas UI/API |
| Railway MongoDB | Manual before deploys | 7 days local | Local dump | mongodump/mongorestore |
| Application code | Every commit | Indefinite | GitHub | Git |
| Environment config | On change | Version controlled | Railway/Vercel dashboards | Manual export |

### Collections Covered

All backup methods capture every collection in the `bemore` database:

- **Applications** -- core submission data with auto-tags and deal-room status
- **Admins** -- admin user accounts and hashed credentials
- **Polls** / **PollResponses** -- live poll definitions and audience votes
- **EmailLogs** -- transactional email send/fail audit trail
- **AnalyticsEvents** -- server-side analytics events
- **PageViews** / **TrackingEvents** -- client-side traffic analytics (1-year TTL)
- **SiteSettings** -- key-value runtime configuration
- **AdminAuditLogs** -- admin action audit trail

---

## 2. MongoDB Atlas Backup (Production)

### 2.1 Automated Continuous Backups

Atlas continuous backup is enabled on the production cluster (`cluster0.wnqr20y.mongodb.net`). Atlas automatically takes:

- **Snapshots** every 6 hours (configurable).
- **Oplog-based continuous backup** allowing point-in-time recovery to any second within the retention window.

**No action required** -- these run automatically as long as the Atlas project billing is current.

#### Verify backup status

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Navigate to **Project > cluster0 > Backup**.
3. Confirm the **Continuous Backup** toggle is ON.
4. Check that the most recent snapshot timestamp is within the last 24 hours.

### 2.2 On-Demand Snapshots (Before Releases)

Take a manual snapshot before every major release or destructive migration.

#### Via Atlas UI

1. Go to **cluster0 > Backup > Take Snapshot Now**.
2. Add a description: `Pre-release snapshot YYYY-MM-DD -- <release tag>`.
3. Set retention to **90 days**.
4. Click **Take Snapshot** and wait for completion (typically 2-5 minutes).

#### Via Atlas Admin API

```bash
# Requires Atlas API key pair with Project Owner role
ATLAS_PROJECT_ID="<your-project-id>"
ATLAS_CLUSTER="cluster0"

curl -s -u "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/$ATLAS_PROJECT_ID/clusters/$ATLAS_CLUSTER/backup/snapshots" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Pre-release snapshot '"$(date +%Y-%m-%d)"'",
    "retentionInDays": 90
  }'
```

### 2.3 Restore from Atlas Snapshot

1. Go to **cluster0 > Backup**.
2. Locate the desired snapshot by date.
3. Click **Restore** and choose:
   - **Restore to this cluster** -- overwrites current data (use with extreme caution).
   - **Restore to a different cluster** -- safer; restore to a temporary cluster, verify, then swap.
   - **Download** -- downloads a tarball for local inspection or mongorestore.
4. Confirm and monitor the restore job under **Backup > Restores**.

### 2.4 Point-in-Time Recovery (Atlas)

Use this when you need to recover to a specific second (e.g., just before an accidental deletion).

1. Go to **cluster0 > Backup > Point in Time**.
2. Select the target date and time (UTC). Atlas shows the available recovery window.
3. Choose the restore target (same cluster or different cluster).
4. Click **Restore** and wait for completion.

> **Tip**: Always restore to a temporary cluster first. Verify data integrity, then use mongodump/mongorestore to move validated data back to production.

---

## 3. Manual Backup with mongodump

### Prerequisites

- Install [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) (includes `mongodump` and `mongorestore`).
- Ensure network access is allowed from your IP in Atlas Network Access settings.

### 3.1 Production Backup (Atlas)

```bash
# Set the connection URI (do NOT commit this value)
PROD_URI="mongodb+srv://<username>:<password>@cluster0.wnqr20y.mongodb.net/bemore"

# Full dump
mongodump --uri="$PROD_URI" --out="./dump_prod_$(date +%Y%m%d_%H%M%S)"
```

Expected output directory structure:

```
dump_prod_20260424_103000/
  bemore/
    applications.bson
    applications.metadata.json
    admins.bson
    polls.bson
    pollresponses.bson
    emaillogs.bson
    analyticsevents.bson
    pageviews.bson
    trackingevents.bson
    sitesettings.bson
    adminauditlogs.bson
    ...
```

### 3.2 Staging Backup (Railway)

```bash
# Railway MongoDB public proxy
STAGING_URI="mongodb://mongo:<password>@shortline.proxy.rlwy.net:28868/bemore_staging?authSource=admin"

# Full dump
mongodump --uri="$STAGING_URI" --out="./dump_staging_$(date +%Y%m%d_%H%M%S)"
```

### 3.3 Single Collection Backup

```bash
# Example: back up only Applications from production
mongodump --uri="$PROD_URI" --collection=applications --out="./dump_applications_$(date +%Y%m%d)"
```

### 3.4 Backup Storage & Cleanup

- Store dumps in a secure local directory or encrypted cloud storage (not in the Git repo).
- Add to `.gitignore` if not already present: `dump_*/`.
- Delete local dumps older than 7 days for staging, 30 days for production.

```bash
# Clean up dumps older than 7 days
find . -maxdepth 1 -type d -name "dump_staging_*" -mtime +7 -exec rm -rf {} +
find . -maxdepth 1 -type d -name "dump_prod_*" -mtime +30 -exec rm -rf {} +
```

---

## 4. Restore Procedures

### 4.1 Full Restore to Staging

Use this to reset staging with a known-good dataset.

```bash
STAGING_URI="mongodb://mongo:<password>@shortline.proxy.rlwy.net:28868/bemore_staging?authSource=admin"

# --drop removes existing collections before restoring
mongorestore --uri="$STAGING_URI" --dir="./dump_prod_20260424_103000/bemore" --drop
```

Verify after restore:

```bash
mongosh "$STAGING_URI" --eval "
  const colls = db.getCollectionNames();
  colls.forEach(c => print(c + ': ' + db.getCollection(c).countDocuments()));
"
```

### 4.2 Full Restore to Production

> **CAUTION**: This is a destructive operation. It will overwrite ALL production data with the contents of the dump. Follow these steps exactly.

**Pre-flight checklist**:

- [ ] Confirm the dump source and date are correct.
- [ ] Take a fresh Atlas on-demand snapshot BEFORE restoring (see section 2.2).
- [ ] Notify the team and set a maintenance window.
- [ ] Disable the backend service on Railway to prevent writes during restore.

```bash
PROD_URI="mongodb+srv://<username>:<password>@cluster0.wnqr20y.mongodb.net/bemore"

# Restore with --drop
mongorestore --uri="$PROD_URI" --dir="./dump_prod_<date>/bemore" --drop
```

**Post-restore**:

- [ ] Re-enable the backend service on Railway.
- [ ] Verify application count: `db.applications.countDocuments()`.
- [ ] Verify admin login works.
- [ ] Spot-check 3-5 application records by refNumber.
- [ ] Verify SiteSettings values are intact.
- [ ] Monitor error logs for 15 minutes.

### 4.3 Point-in-Time Recovery (Atlas)

See section 2.4 above. This is the preferred method for recovering from accidental data deletion in production because it does not require a local dump.

### 4.4 Single Collection Restore

```bash
# Restore only the applications collection to staging
mongorestore --uri="$STAGING_URI" \
  --collection=applications \
  --dir="./dump_prod_20260424_103000/bemore/applications.bson" \
  --drop
```

---

## 5. Data Migration Between Environments

### 5.1 Production to Staging (Seed Staging)

Use this to populate staging with realistic production data for testing.

```bash
# Step 1: Dump production
mongodump --uri="$PROD_URI" --out="./dump_prod_seed"

# Step 2: Restore to staging (drops existing staging data)
mongorestore --uri="$STAGING_URI" --dir="./dump_prod_seed/bemore" --drop

# Step 3: Scrub sensitive data in staging (recommended)
mongosh "$STAGING_URI" --eval "
  // Reset all admin passwords to a known test value
  // (hash for 'StagingTest123!')
  db.admins.updateMany({}, { \$set: { password: '\$2b\$10\$testHashReplaceMeWithActualBcryptHash' } });

  // Mask PII in applications
  db.applications.updateMany({}, [
    { \$set: {
      'personal.email': { \$concat: ['staging_', { \$toString: '\$_id' }, '@test.local'] },
      'personal.phone': '+27000000000'
    }}
  ]);

  print('Staging data scrubbed.');
"
```

> **Important**: Always scrub PII before using production data in staging. POPIA requires that personal information is protected in non-production environments.

### 5.2 Staging to Production (Promote Data)

This is rare and should only be done when staging contains canonical data that must go live (e.g., pre-seeded poll configurations).

```bash
# Step 1: Dump staging
mongodump --uri="$STAGING_URI" --out="./dump_staging_promote"

# Step 2: Take production snapshot first (mandatory)
# See section 2.2

# Step 3: Restore specific collections only (do NOT use --drop on the full DB)
mongorestore --uri="$PROD_URI" \
  --collection=polls \
  --dir="./dump_staging_promote/bemore_staging/polls.bson" \
  --drop
```

---

## 6. Disaster Recovery Scenarios

### 6.1 Atlas Cluster Failure

**Symptoms**: Application returns 500 errors, MongoDB connection timeouts in Railway logs.

**Response**:

1. Check [Atlas Status](https://status.mongodb.com/) for ongoing incidents.
2. If Atlas confirms an outage, enable demo mode on the frontend (it auto-detects backend unavailability).
3. Once Atlas recovers, verify data by checking application counts and recent submissions.
4. If Atlas does not auto-recover within the SLA, restore from the most recent snapshot to a new cluster:
   - Atlas UI > Backup > select snapshot > Restore to New Cluster.
   - Update `MONGODB_URI` in Railway environment variables to point to the new cluster.
   - Redeploy the backend on Railway.

### 6.2 Railway MongoDB Data Loss (Staging)

**Symptoms**: Staging returns empty results, collections missing.

**Response**:

1. Check Railway dashboard for service health and recent deploys.
2. Restore from the most recent local dump:
   ```bash
   mongorestore --uri="$STAGING_URI" --dir="./dump_staging_<latest>/bemore_staging" --drop
   ```
3. If no local dump is available, seed from production (see section 5.1).

### 6.3 Accidental Data Deletion

**Symptoms**: Admin reports missing records, application counts dropped unexpectedly.

**Production response**:

1. Immediately identify the time of deletion from AdminAuditLogs or Railway backend logs.
2. Use Atlas Point-in-Time Recovery (section 2.4) to restore to the second before deletion.
3. Restore to a **temporary cluster** first.
4. Export only the affected collection(s) from the temporary cluster.
5. Import the affected collection(s) back into production.

**Staging response**:

1. Restore from local dump or re-seed from production.

### 6.4 Full Environment Rebuild (From Scratch)

If both the application and database need to be recreated:

1. **Code**: Clone the repository from GitHub (`main` branch).
2. **Backend environment**: Create a new Railway project, set all environment variables from `.env.example` and the values documented in `docs/environment-setup.md` (or retrieve from the team's secrets manager).
3. **Database**: Either restore from an Atlas snapshot or create a fresh Atlas cluster and run the backend -- it will auto-seed the admin account on first startup (`server.js` seed logic).
4. **Frontend**: Create a new Vercel project linked to the GitHub repo, configure `vercel.json` rewrites to point to the new Railway backend URL.
5. **DNS**: Update any custom domain records if applicable.
6. **Verify**: Run through the post-restore checklist (section 4.2).

---

## 7. Recovery Testing Schedule

| Test | Frequency | Procedure | Owner |
|------|-----------|-----------|-------|
| Full mongorestore to staging | Monthly | Dump production, restore to staging, verify counts and login | DevOps |
| Point-in-time recovery drill | Quarterly | Restore Atlas to temp cluster at T-1hr, verify specific records | DevOps |
| Single collection restore | Quarterly | Restore `applications` to staging, verify integrity | DevOps |
| Full environment rebuild | Annually | Spin up new Railway + Vercel from scratch, verify end-to-end | DevOps + Engineering |

### Test Log

Record every recovery test in this table:

| Date | Test Type | Result | Duration | Notes |
|------|-----------|--------|----------|-------|
| _YYYY-MM-DD_ | _Full restore_ | _Pass/Fail_ | _Xm_ | _Any issues_ |

---

## 8. Important Notes

1. **Never commit dump files to Git.** Ensure `dump_*/` is in `.gitignore`. Database dumps contain PII and credentials.

2. **Rotate credentials after sharing.** If a connection URI was shared over chat, email, or any non-secure channel, rotate the MongoDB user password immediately in Atlas/Railway and update the `MONGODB_URI` environment variable.

3. **Verify data integrity after every restore.** At minimum:
   - Compare document counts per collection (before vs. after).
   - Spot-check 3-5 application records by `refNumber`.
   - Verify admin login succeeds.
   - Confirm TTL indexes are intact (`PageViews`, `TrackingEvents` -- 1-year TTL; `Applications` -- 24-month TTL).

4. **Network access.** Atlas restricts connections by IP. Before running `mongodump` or `mongorestore`, add your current IP to the Atlas Network Access list (or use `0.0.0.0/0` temporarily for emergencies -- remove immediately after).

5. **mongodump/mongorestore versions.** Use MongoDB Database Tools version 100.x or later. Ensure the tools version is compatible with the server version (MongoDB 6.x/7.x).

6. **Large collections.** `PageViews` and `TrackingEvents` can grow large. For routine backups, consider excluding them if storage is constrained:
   ```bash
   mongodump --uri="$PROD_URI" \
     --excludeCollection=pageviews \
     --excludeCollection=trackingevents \
     --out="./dump_prod_core_$(date +%Y%m%d)"
   ```

7. **Backup before destructive operations.** Always take a backup (Atlas snapshot or mongodump) before:
   - Running database migrations or schema changes.
   - Deploying code that modifies data in bulk.
   - Running any `deleteMany`, `drop`, or `updateMany` operations in production.

8. **POPIA compliance.** Production dumps contain personal information. Store them encrypted, limit access to authorized personnel, and delete when no longer needed. Never restore production PII to environments accessible by unauthorized parties without scrubbing first (see section 5.1).
