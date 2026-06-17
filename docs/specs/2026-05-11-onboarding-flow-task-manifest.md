# TASK MANIFEST — Onboarding Flow Update (All 6 Profiles)

**Generated:** 2026-05-11
**Architect:** bukani-architect
**Source spec:** [`/home/sibnaye/Development/Bemore/docs/specs/2026-05-11-onboarding-flow-update-design.md`](./2026-05-11-onboarding-flow-update-design.md) (commit `f7aedaa`)
**Sprint goal:** Replace each profile's question set with the Workstream C memorandum content within the existing 5-step shell, add a universal feedback layer, add optional CV upload for Built Environment Professionals, and update auto-tagging + admin views accordingly. No DB migration. Ship all 6 profiles in one update.
**Status:** **CLOSED 2026-05-11.** All BE-1..5, FE-1..5, QA-1..4, DOC-1..3 complete. DV-1 (production Railway volume) is the only carry-over (staging volume already provisioned and verified).

## Final task status

| Task | Status |
|---|---|
| BE-1 — `attachments[]` schema field | ✅ Complete |
| BE-2 — `POST /api/applications/upload` | ✅ Complete |
| BE-3 — `POST /api/applications` accepts `attachments[]` | ✅ Complete |
| BE-4 — GET/DELETE/signed attachment endpoints | ✅ Complete |
| BE-5 — Auto-tag engine rewrite | ✅ Complete |
| FE-1 — Question types + renderer | ✅ Complete |
| FE-2 — 6 per-profile question configs | ✅ Complete |
| FE-3 — Step file rewrites + form submission | ✅ Complete |
| FE-4 — Admin lead detail + leads list | ✅ Complete |
| FE-5 — CSV export columns | ✅ Complete |
| DV-1 — Staging Railway volume | ✅ Complete |
| DV-2 — Production Railway volume | ⏳ **Pending** — sole carry-over |
| QA-1 — Automated test suites | ✅ Complete (308/308 backend, 386/386 frontend) |
| QA-2 — Cross-engine parity test | ✅ Complete |
| QA-3 — Staging soak | ✅ Complete (APPROVED after blocker #1 Submit-bail fix) |
| QA-4 — Pre-prod sign-off + vercel.json check | ✅ Complete |
| DOC-1 — OpenAPI + SCHEMA + ADR | ✅ Complete |
| DOC-2 — POPIA + deployment runbook | ✅ Complete |
| DOC-3 — the project guide update | ✅ Complete (this docs pass, 2026-05-11) |

---

## Contracts (already defined in the spec)

| Contract | Source |
|---|---|
| API contract (4 endpoints) | spec §8.1–8.7 |
| Schema contract (`attachments[]`, `formData` keys per profile) | spec §7.1–7.3 |
| Frontend component contract (Question schema, renderer, step-readiness, UI states) | spec §6.1–6.5 |
| Admin UI contract (lead detail, leads list, CSV) | spec §6.6–6.8 |
| Auto-tagging rules (universal, per-profile, composite, removed) | spec §9.1–9.5 |
| Acceptance criteria | spec §8 (per endpoint), §9.6, §15 |

> Implementation agents must NOT change any of the locked decisions in spec §4. If a question arises that the spec does not answer, escalate back to the architect — do not relitigate.

---

## Validation checkpoints (architect re-engagement)

| Checkpoint | When | What to verify before unblocking |
|---|---|---|
| **CP-1** | Backend reports BE-1…BE-5 done | All four endpoints exist with §8 error codes; `attachments[]` schema field landed; auto-tag engine updated; analytics aggregations no longer reference legacy keys (or fall back gracefully); CI green. |
| **CP-2** | Frontend reports FE-1…FE-5 done | All 6 profile configs exist; renderer + step-readiness pass unit tests; admin lead detail renders both new and legacy applications without crashing; CSV export emits the §6.8 column set. |
| **CP-3** | DevOps reports DV-1…DV-2 done | Staging Railway volume mounted at `/app/uploads`; redeploy survives a touch-file test; production volume provisioned but not yet active. |
| **CP-4** | QA reports QA-1…QA-4 done | All §11.1–11.3 automated tests green; §11.4 manual checklist signed off on staging; cross-engine parity test green. |
| **CP-5** | Pre-prod cutover | Staging soak (spec §10.4) complete; `frontend/vercel.json` post-merge sanity check (the project guide "Post-Merge Warning") performed. |

---

## Cross-agent dependency graph

```
DV-1 (volume bootstrap, staging)
        │
        ▼
BE-1 → BE-2 → BE-3 → BE-4 → BE-5 ──┐
                                    │
   FE-1 (types) → FE-2 (configs) ──┤  (FE-2 may start in parallel with BE; FE-3+ block on CP-1)
                                    │
                                    ▼
                              CP-1 (architect)
                                    │
                                    ▼
              FE-3 → FE-4 → FE-5 (admin views, CSV) ──┐
                                                       ▼
                                                  CP-2 (architect)
                                                       │
                                                       ▼
                                                  QA-1 → QA-2 → QA-3 → QA-4
                                                       │
                                                       ▼
                                                  CP-4 (architect)
                                                       │
                                                       ▼
                                              DV-2 (production volume) → production cutover (spec §10.5)
                                                       │
                                                       ▼
                                                  DOC-1 → DOC-2 → DOC-3
```

Backend (BE-1…BE-5), DevOps DV-1, and Frontend FE-1/FE-2 may start in parallel. Frontend FE-3+ MUST wait for CP-1.

---

# BACKEND — `bukani-backend`

> Working brief. All work goes in `backend/src/`. Tests in `backend/__tests__/`. ESM only — `import`/`export`, never `require`. Run `npm test` and `npm run test:coverage` after each task.

## BE-1 — Add `attachments[]` schema field on `Application`

**Input:** `/home/sibnaye/Development/Bemore/backend/src/models/Application.js` (existing model, do not break existing fields).
**Task:** Add the `attachments[]` sub-document field per spec §7.1. Default `[]`. No new indexes. Confirm existing TTL on parent doc still applies. Do NOT change any existing field.
**Output:** Updated model file. Existing tests still green. New schema test asserting `attachments` defaults to `[]` and old documents (loaded without the field) deserialise without error.
**Acceptance:**
- `new Application({...minimal valid doc...})` returns `.attachments` as `[]` (not `undefined`).
- An old serialised doc loaded via `Application.findOne()` does not throw.
- `npm test` green.
**Dependencies:** none.
**Risk:** Touching this file at all — re-run all 215 backend tests; any field-naming drift cascades.

---

## BE-2 — Add `POST /api/applications/upload` endpoint

**Input:** spec §8.1, existing CSRF middleware at `backend/src/middleware/auth.js` (`csrfProtection`), existing public rate limiter in `backend/src/config/rateLimit.js`, route registration pattern at `backend/src/routes/applications.js`.
**Task:** Implement the multipart upload endpoint exactly per spec §8.1. Use `multer` (or equivalent already-installed multipart parser — check `backend/package.json` first; do NOT add a heavy new dep without architect sign-off). Validate MIME type whitelist + 5 MB cap. Sanitise filename to `[a-zA-Z0-9 ._-]`. Generate `storedAs` as `${randomUUID()}.${ext}`. Write to `/app/uploads/cv/{storedAs}` with mode `0644`. Return the four-field success body. CSRF + public rate limiter applied. **No DB write here.**

For local dev, the upload directory should be configurable via env var `UPLOAD_DIR` (default `/app/uploads`). Create the directory on boot if missing.

**Output:** New route handler in `backend/src/routes/applications.js`, new service module `backend/src/services/uploadService.js` (filename sanitiser, disk writer, MIME validation). Endpoint test file `backend/__tests__/upload.test.js` covering all 6 acceptance criteria + all 6 error codes from spec §8.1.
**Acceptance:** every "✅" bullet in spec §8.1 passes as an automated test. CI green.
**Dependencies:** BE-1.
**Risk:** **Choosing the multipart parser.** If `multer` is not already installed, escalate to architect before adding it (express-fileupload is an alternative, and the existing dep tree should be respected).

---

## BE-3 — Modify `POST /api/applications` to accept `attachments[]`

**Input:** spec §8.2, `backend/src/services/applicationService.js`, `backend/src/controllers/applicationController.js`.
**Task:** Accept optional `attachments[]` in the request body. Validate every entry's `field` is in `['cv']`. For each entry, `fs.stat` `/app/uploads/cv/{storedAs}` to confirm presence; read file size + MIME type from disk and persist as `{ field, filename, storedAs, size, mimeType, uploadedAt }` on the new Application. If any `storedAs` is missing on disk → 400 `ATTACHMENT_NOT_FOUND` (do not delete other uploads — leave for sweeper). If `field` not allowed → 400 `ATTACHMENT_FIELD_INVALID`. Submitting without `attachments` keeps existing behaviour byte-identical.
**Output:** Updated service + controller; new tests in `backend/__tests__/applications.test.js` covering the three §8.2 acceptance criteria.
**Acceptance:** spec §8.2 ✅ bullets all pass. Old submission shape (no `attachments` field) still passes existing tests.
**Dependencies:** BE-1, BE-2.

---

## BE-4 — Add `GET` and `DELETE` attachment endpoints + signed-link variant

**Input:** spec §8.3, §8.4, §8.5 (signing scheme), `backend/src/middleware/auth.js`, `backend/src/models/AdminAuditLog.js`.
**Task:** Implement four routes:
1. `GET /api/applications/:refNumber/attachment/:storedAs` — JWT + admin limiter, streams the file with `Content-Disposition: attachment; filename="<original>"`, writes one `AdminAuditLog` entry per success (action `attachment.download`).
2. `DELETE /api/applications/:refNumber/attachment/:storedAs` — JWT + admin limiter, deletes file + array entry + audit log (action `attachment.delete`). Idempotent (404 if already gone). Disk delete failure must NOT block DB delete (log + alert, file becomes orphan).
3. `GET /api/applications/:refNumber/attachment/:storedAs/signed` — public, no JWT, validates `expires` and `sig` query params per spec §8.5 signing scheme. 410 `LINK_EXPIRED` after 5 min, 403 `BAD_SIGNATURE` on tamper. Writes audit log entry `attachment.signed-download` with `actor: 'self-service'`.
4. Modify `POST /api/applications/data-export` (spec §8.5) to include `attachments[]` with `filename, size, mimeType, downloadUrl` — generate signed URLs server-side. Modify `POST /api/applications/data-delete` (spec §8.6) to remove files from disk in the same op (log + proceed if disk delete fails).

All routes must return 410 `FILE_MISSING_ON_DISK` when DB references a file that the disk no longer has.

**Output:** Routes added to `backend/src/routes/applications.js`; signing helper in `backend/src/utils/signedLinks.js`; tests in `backend/__tests__/attachments.test.js` covering every error code from §8.3–8.6.
**Acceptance:** all "✅" bullets in spec §8.3, §8.4, §8.5, §8.6 pass.
**Dependencies:** BE-1, BE-2, BE-3.
**Risk:** **Signed-link endpoint is public** — make sure CSRF and auth middleware do NOT apply to the signed variant. Confirm route ordering in `backend/src/routes/index.js`: the signed variant must NOT fall under the `authMiddleware, csrfProtection` blanket on line 28.

---

## BE-5 — Rewrite auto-tag engine for new field keys

**Input:** spec §9 (full ruleset), existing `backend/src/utils/autoTag.js` (the `pre('save')` hook lives here and is wired in `Application.js`).
**Task:** Rewrite `autoTag.js` to read the new field keys from spec §7.2 and emit ONLY the §9.1–9.4 tags. Never emit §9.5 (legacy) tags. Engine must:
- Be pure (input `formData` + `userType` → output `tags[]`), so it can be unit-tested without Mongoose.
- Run on `isNew` only (existing behaviour).
- Produce `[]` when no fields match (no crash on partial data).

Also write a tests file `backend/__tests__/autoTag.test.js` with one unit test per rule (universal + per-profile + composites + a negative test asserting NO §9.5 legacy tag is ever emitted).

**Output:** Rewritten `autoTag.js`; comprehensive test file. Existing autoTag-related tests must be migrated, not duplicated.
**Acceptance:** spec §9.6 bullets all green.
**Dependencies:** BE-1.
**Risk callout — files to audit for hard-coded old field names (per spec §12):**
- `backend/src/services/analyticsService.js` lines 211/215/219 reference `formData.estimatedValue`, `formData.previousFunding`, `formData.landStatus`. These produce empty buckets after this change. **In this task: leave the queries in place but add a fallback to the new field names** (`projectValue`, `landOutcome`) using `$ifNull` so legacy + new docs both aggregate. Document this in the file with an inline comment.
- `backend/src/controllers/applicationController.js` line 172 (CSV export) references `formData.estimatedValue/projectStage/landStatus`. **Update in BE-5** to also include the new universal columns + per-profile columns from spec §6.8 (this is a backend-side CSV export — the frontend export in `frontend/src/utils/csv.ts` is a separate task FE-5).
- `backend/src/services/applicationService.js` line 9 references `data.formData.engagementSource` — leave as is (that field is unchanged).

---

# FRONTEND — `bukani-frontend`

> Working brief. All work in `frontend/src/`. TypeScript strict (`npm run typecheck` must pass). Tests in `frontend/src/__tests__/`. Run `npx vitest run` after each task.

## FE-1 — Add Question types and shared renderer skeleton

**Input:** spec §6.1, §6.2, §6.3.
**Task:**
- Create `frontend/src/types/question.ts` with `QuestionType`, `Question`, `ProfileQuestions` types per spec §6.2.
- Create `frontend/src/components/question-group.ts` exporting `renderQuestionGroup(questions, formData, onChange)` per spec §6.3. Must respect `showIf`, run `validate`, render text/email/phone/textarea/radio/checkbox/dropdown/file inputs. Inputs share existing styling tokens. ARIA-correct.
- Add unit tests in `frontend/src/__tests__/question-group.test.ts`: render fixture, simulate input, assert `onChange` called with correct `(id, value)`; assert hidden `showIf` questions not rendered.

**Output:** Two new files + one test file. `npm run typecheck` and `npx vitest run` both green.
**Acceptance:** all 7 input types render; `showIf` correctly hides; `onChange` fires with the right args.
**Dependencies:** none. **Can run in parallel with backend.**

---

## FE-2 — Author 6 per-profile question configs

**Input:** spec §5 (step mapping), §5.1 (conditional list), §7.2 (field key naming), §14 (canonical `activityLevel` enum), source PDF (spec is authoritative — only consult PDF for label wording when ambiguous).
**Task:** Create six files under `frontend/src/constants/profiles/`:
- `developer.questions.ts`
- `landowner.questions.ts`
- `investor.questions.ts`
- `student.questions.ts`
- `professional.questions.ts`
- `aspiring.questions.ts`

Each exports a `ProfileQuestions` object with `step1…step5`. Field IDs MUST match spec §7.2 exactly. `showIf` predicates MUST match spec §5.1 exactly. The universal Step-5 questions (`activityLevel`, `feedback`, `notActiveReason`) appear on every profile. The Professional profile's Step 4 includes the optional CV `file` question per spec §5 row "4 — Contact". Use the canonical `activityLevel` enum from spec §14 — display label may vary per profile question text but stored values are exactly `'Actively looking' | 'Open to the right opportunity' | 'Not actively looking'`.

Add a parity test `frontend/src/__tests__/profile-configs.test.ts`:
- For each profile, walk all 5 steps and assert the question IDs equal the expected list (use the spec §5 / §7.2 mapping as the test fixture).
- For each conditional in spec §5.1, assert `showIf` returns true/false against the right formData fixture.

**Output:** 6 config files + 1 test file. `npx vitest run` green.
**Acceptance:** every required field per profile present; conditionals fire correctly; field IDs match spec §7.2 character-for-character (test enforces this).
**Dependencies:** FE-1. **Can run in parallel with backend.**

---

## FE-3 — Replace step files with thin renderers + update form submission

> ⚠️ **Blocked on CP-1.** Backend must have shipped BE-2/BE-3 so the upload endpoint exists.

**Input:** spec §6.1 (file rename plan), spec §6.4 (`nextStepReady` contract), spec §6.5 (UI states), existing files in `frontend/src/pages/public/form-steps/`, `frontend/src/pages/public/form.ts`.
**Task:**
- Rename and rewrite the five step files per spec §6.1:
  - `step-basic.ts` → `step-identity.ts`
  - `step-readiness.ts` → `step-position.ts`
  - `step-funding.ts` → `step-constraints.ts`
  - `step-project.ts` → `step-contact.ts`
  - `step-confirm.ts` → `step-feedback-consent.ts`
- Each file becomes thin: imports the profile config, calls `renderQuestionGroup` for the matching step, wires `onChange` to the reactive store. Step 1 still writes `firstName`/`surname` directly to `personal`; Step 4 still writes `email`/`phone` directly to `personal` (per spec §7.2 final paragraph). Step 5 renders consent separately from the feedback question group (per spec §5).
- Implement `nextStepReady(stepIndex, profile, formData)` per spec §6.4 in `frontend/src/utils/step-readiness.ts` (replaces existing `SKIP_GENERIC` block). Hidden-by-`showIf` questions are NOT required.
- Rewrite `collectAllFormData()` in `form.ts` to read directly from the reactive store using the profile config field IDs — no more profile-specific delete-list hacks. Old keys (`landStatus`, `projectStage`, `estimatedValue`, `seeking`, `previousFunding`, `totalBedCount`, `averageOccupancy`, `supportNeeds`, `growthIntention`, `developmentTypes` legacy usage) MUST NOT appear in the submitted body.
- Wire CV upload (Professional only): on file selection, POST multipart to `/api/applications/upload`, store the returned `{ filename, storedAs }` in formData, render UI states from spec §6.5 (in-progress, error, success). On final submit, include `attachments: [{ field: 'cv', storedAs }]`.
- Update `frontend/src/api.ts` to support multipart upload and to send `attachments[]` on submission. Demo mode (localStorage fallback) should accept attachments as a no-op (skip file upload, store stub metadata).

Update `frontend/src/utils/auto-tag.ts` to mirror BE-5 exactly. Add `frontend/src/__tests__/auto-tag.test.ts` covering every rule.

**Output:** 5 renamed step files (thin), updated `form.ts`, updated `step-readiness.ts`, updated `auto-tag.ts`, updated `api.ts`. Tests for `nextStepReady` per profile per step (12 tests minimum) and the auto-tag mirror.
**Acceptance:**
- Filling all 5 steps for any profile produces a body whose `formData` keys are EXACTLY the spec §7.2 set for that profile (no legacy keys, no extras).
- Conditional questions hide/show correctly per spec §5.1.
- "Next" button stays disabled until visible required fields are filled.
- CV upload Professional flow: in-progress, error, success states all render per spec §6.5.
- All §11.1 vitest tests green.
**Dependencies:** FE-1, FE-2, BE-2, BE-3 (CP-1).
**Risk callout — files to audit for hard-coded old field names:**
- `frontend/src/pages/public/form.ts` lines 320–388 — entire `collectAllFormData()` block is being rewritten; verify NO legacy field name survives by grepping for `landStatus|projectStage|estimatedValue|previousFunding|totalBedCount|averageOccupancy|supportNeeds|growthIntention` in the final diff.

---

## FE-4 — Update admin lead detail + leads list

> ⚠️ **Blocked on FE-3.**

**Input:** spec §6.6, §6.7, existing `frontend/src/components/app-detail-modal.ts`, `frontend/src/pages/admin/leads.ts`, `frontend/src/constants/tags.ts`.
**Task:**
- Rewrite `app-detail-modal.ts` to use a generic per-profile `PROFILE_FIELD_LABELS` map (new file `frontend/src/constants/profile-field-labels.ts`) keyed by `userType` then `formData` field ID, returning the human label. Unknown keys fall through to `humanise(key)`. Render in three sections (*Position & Activity*, *Constraints & Alignment*, *Feedback*). Activity badge at top: gold = `ACTIVELY_LOOKING`, neutral = `OPEN_TO_OPPORTUNITY`, grey = `LOW_INTENT`. CV download button for Professional applications with attachments — calls `GET /api/applications/:refNumber/attachment/:storedAs` and triggers a browser download.
- Update `leads.ts` filter chips per spec §6.7: always-visible (`Actively looking`, `Open`, `Low intent`, `Pipeline ready`, `Hot investor`, `Institutional operator`); profile-conditional chips appear only when a profile filter is selected. Legacy tags (spec §9.5) MUST NOT render as chips or card badges. Add an explicit blocklist constant in `tags.ts` and use it.
- Update column derivations in `leads.ts` (lines 92, 100, 170) and `dashboard.ts` line 250 + `deal-room.ts` line 67 + `reports.ts` lines 100 and 142 + `pdf-report.ts` lines 32, 59, 97, 98 to read NEW field keys with old-key fallback (so legacy applications still display something).

**Output:** Updated files, `profile-field-labels.ts`, blocklist constant, tests asserting no §9.5 tag renders as a chip and that an old-shape application opens in the detail modal without crashing (via `humanise()` fallback).
**Acceptance:**
- Activity badge colour matches `activityLevel` value.
- Lead detail renders all new fields with proper labels and an empty state when `formData` is empty (per spec §6.5 last row).
- Old applications still display via `humanise()` fallback without error.
- No legacy tag (spec §9.5) renders as a chip.
- CV download works for Professional applications with attachments.
**Dependencies:** FE-3.
**Risk callout — files to audit:**
- `frontend/src/pages/admin/guide.ts` lines 195, 200, 232 — narrative copy mentions `LAND_SECURED`, `INSTITUTIONAL_GRADE`, `PIPELINE_READY`, `HIGH_VALUE`. Update narrative to reflect the new tag definitions in spec §9.3–9.4 (do NOT remove `INSTITUTIONAL_GRADE` or `PIPELINE_READY` — they are retained but redefined).

---

## FE-5 — Update CSV export columns

> ⚠️ **Blocked on FE-4.**

**Input:** spec §6.8 (column set), `frontend/src/utils/csv.ts`.
**Task:** Rewrite `csv.ts` so the CSV emits universal columns on every row + per-profile-conditional columns only when at least one application of that profile exists in the export set. Old applications with missing keys render empty cells. Existing formula-injection prefix protection stays. Keep API surface (function name + signature) the same so callers do not break.

Note: backend-side CSV export at `backend/src/controllers/applicationController.js` line 172 was already updated in BE-5; this task is the frontend mirror (used for in-browser exports).

**Output:** Updated `csv.ts`, test in `frontend/src/__tests__/csv.test.ts` covering: universal columns always present; per-profile columns appear iff a matching profile is in the input set; empty cells for missing keys; formula injection prefixed.
**Acceptance:** spec §6.8 column rules enforced exactly.
**Dependencies:** FE-4.

---

# DEVOPS — `bukani-devops`

> Working brief. Touches Railway projects only — no application code.

## DV-1 — Provision staging Railway volume

**Input:** spec §10.2 step 1 + step 3.
**Task:**
1. Provision a 1 GB volume on the staging Railway project.
2. Mount it at `/app/uploads` on the staging backend service.
3. Trigger a no-op redeploy. Exec `ls /app/uploads` to confirm mount.
4. Touch a file (`echo > /app/uploads/.smoketest`), redeploy, confirm file persists.
5. Add `UPLOAD_DIR=/app/uploads` to staging environment variables (architect-approved default; matches BE-2's env var).

**Output:** Volume mounted, smoketest file present after redeploy, env var set, screenshot or CLI output captured for the architect's CP-3 review.
**Acceptance:** `ls /app/uploads/.smoketest` returns the file after a redeploy of staging.
**Dependencies:** none. **Can run in parallel with all backend/frontend work.** Must complete before CP-1 (so backend tests against staging can write files).

---

## DV-2 — Provision production Railway volume

> ⚠️ **Blocked on CP-4** (QA sign-off on staging).

**Input:** spec §10.2 step 2 + step 4.
**Task:** Same as DV-1 but on the production Railway project. Verify `UPLOAD_DIR` env var set on production. Do NOT deploy any new backend code yet — production cutover happens via the standard `staging → main` merge in spec §10.5.

**Output:** Production volume mounted and verified.
**Acceptance:** Production `ls /app/uploads/.smoketest` returns the file after a redeploy.
**Dependencies:** CP-4.

---

# QA — `bukani-qa`

> Working brief. All testing happens AFTER backend + frontend report done at CP-2.

## QA-1 — Run automated test suites

**Input:** spec §11.1 + §11.2 + §11.3.
**Task:** On a clean checkout of `staging`:
- `cd backend && npm test` — must be green, including all new endpoint tests, autoTag tests, schema tests, attachment tests, signed-link tests.
- `cd frontend && npm run typecheck && npx vitest run` — must be green, including all new question-group, profile-config, step-readiness, auto-tag, csv tests.
- `cd backend && npm run test:coverage` — coverage on changed files must be ≥80%.

**Output:** Test report with pass counts and coverage delta on changed files.
**Acceptance:** 0 failing tests, ≥80% coverage on changed files.
**Dependencies:** CP-2.

---

## QA-2 — Cross-engine parity test

**Input:** spec §9.6 bullet 2.
**Task:** Build 6 fixtures (one per profile) representing typical submissions. Feed each through both `backend/src/utils/autoTag.js` and `frontend/src/utils/auto-tag.ts`. Assert identical tag arrays (set equality). This may live as a Node script in `backend/__tests__/parity.test.js` that imports the frontend module directly (or a shared fixture file consumed by both Vitest and Jest).
**Output:** Parity test in CI; both engines emit identical tags for all 6 fixtures.
**Acceptance:** Parity test green; failing the test would block the merge.
**Dependencies:** QA-1.

---

## QA-3 — Staging soak

**Input:** spec §10.4 + §11.4 manual checklist.
**Task:** On the deployed staging environment (`bemorecapital.co.za` + `bemore-staging.up.railway.app`):
1. Submit one application per profile (6 total). For each, verify: saves with new `formData` keys; auto-tags applied (check via admin lead detail); lead detail renders all fields with labels; activity badge correct colour; CSV export includes new columns.
2. Submit a Professional application with CV upload. Verify: file uploads (200 response); application persists with `attachments[0]`; admin can download CV; file survives a Railway staging redeploy (DevOps triggers redeploy mid-test); `POST /api/applications/data-delete` removes file from disk (verify by SSH/exec into Railway).
3. Open one legacy application in admin (use the demo data or an existing pre-deploy submission). Verify: old `formData` keys render via `humanise()`; legacy tags do NOT appear as chips or card badges.
4. Walk the §11.4 manual checklist top to bottom; sign each box.

**Output:** Signed checklist + screenshots of: each profile lead detail, CV download, redeploy survival, legacy app detail, admin chips list.
**Acceptance:** Every checkbox in spec §11.4 ticked; spec §10.4 verifications all pass.
**Dependencies:** QA-1, QA-2, DV-1.

---

## QA-4 — Pre-prod sign-off & vercel.json verification

**Input:** spec §10.5, the project guide "Post-Merge Warning".
**Task:** Before squash-merging `staging` → `main`:
- Confirm all QA-3 items signed off.
- Inspect the proposed merge diff for `frontend/vercel.json`. The rewrite destination must be `bemore-production.up.railway.app` (NOT staging). The CSP `connect-src` must reference `bemore-production.up.railway.app`. If staging URLs leak, the squash merge will overwrite production URLs — flag back to architect.
- After merge: hit production `/api/health`, submit one test application per profile, then delete each via admin.

**Output:** Sign-off note for the architect, including the vercel.json diff inspection.
**Acceptance:** Production smoke green; vercel.json verified clean.
**Dependencies:** QA-3.

---

# DOCS — `bukani-docs`

> Working brief. Runs LAST, after CP-4 and production cutover. All deliverables in spec §13.

## DOC-1 — Update OpenAPI + SCHEMA + ADR

**Input:** spec §13.
**Task:**
- `docs/api/openapi.yaml`: add the four new/modified endpoints (`POST /applications/upload`, `GET /applications/{refNumber}/attachment/{storedAs}`, `DELETE /applications/{refNumber}/attachment/{storedAs}`, signed-link variant); update `Application` schema with `attachments[]`; update `POST /applications` request schema with optional `attachments[]`; update `POST /applications/data-export` and `POST /applications/data-delete` response schemas.
- `docs/SCHEMA.md`: add `attachments[]` field; document new `formData` keys per profile (full table from spec §7.2).
- `docs/adr/0009-declarative-question-configs.md`: NEW ADR documenting the §6 declarative-config + shared-renderer pattern. Status: Accepted. Supersedes nothing. Reference the spec.
- `docs/architecture.md`: brief note on declarative question config + shared renderer.

**Output:** All files committed.
**Acceptance:** OpenAPI validates (`npx @redocly/cli lint docs/api/openapi.yaml` or equivalent); ADR follows the existing 001–008 format; SCHEMA.md tables render.
**Dependencies:** Production cutover complete.

---

## DOC-2 — Update POPIA + deployment runbook

**Input:** spec §13.
**Task:**
- `docs/compliance/popia.md`: note attachment data-export (signed links, 5-min expiry) and data-delete (file removal) behaviour. Add `attachments[].filename` to the PII register with rationale (may include person's name).
- `docs/runbooks/deployment.md`: add Railway volume bootstrap step (per spec §10.2) so a future fresh environment knows to provision the volume before backend deploys.

**Output:** Both files updated.
**Acceptance:** PII register lists attachments; runbook explicitly walks through provisioning and mounting the volume.
**Dependencies:** DOC-1.

---

## DOC-3 — Update the project guide

**Input:** Sections of the project guide to edit (architect-scoped):
1. **"Application Data Model"** — add `attachments[]` field to the model snippet.
2. **"Profile-Aware Form"** — replace the description with the new §6 architecture (declarative configs in `frontend/src/constants/profiles/`, shared `<question-group>` renderer, conditional `showIf` predicates, universal Step-5 feedback).
3. **"Auto-Tagging Engine"** — replace the tag list with the spec §9.1–9.4 set; explicitly call out that §9.5 legacy tags exist on old documents but are no longer emitted.
4. **"Key Architecture Patterns"** → add a new sub-section *"File Uploads"* describing the Railway volume mount, upload endpoint, signed links, and sweeper cron.
5. **"Environment Variables (Backend)"** — add `UPLOAD_DIR=/app/uploads`.
6. **"API"** section — add the four new endpoints to the public + admin lists.
7. **"Sprint state"** section — mark sprint complete with merge date and link to the spec + manifest.

**Output:** the project guide updated; `Last updated` date bumped.
**Acceptance:** All seven edits landed; the project guide still well-structured (no duplication, no stale references to legacy field keys).
**Dependencies:** DOC-1, DOC-2.

---

# Summary table

| Agent | Tasks | Blocks |
|---|---|---|
| backend | BE-1, BE-2, BE-3, BE-4, BE-5 | CP-1 |
| frontend | FE-1, FE-2, FE-3, FE-4, FE-5 | CP-2 |
| devops | DV-1, DV-2 | CP-3, production cutover |
| qa | QA-1, QA-2, QA-3, QA-4 | CP-4, production cutover |
| docs | DOC-1, DOC-2, DOC-3 | sprint close |

Total: **19 tasks**.

---

# Notes flagged to architect (for follow-up after manifest dispatch)

- Spec §8.5 signing scheme: `JWT_SECRET` reused as HMAC key. Acceptable for now (single-secret rotation), but if `JWT_SECRET` rotates, in-flight signed links become invalid. Doc this in the runbook.
- Spec §10.2 step 4 says "touch a file, redeploy, file present" — DV-1 task makes this explicit with a `.smoketest` file path.
- Spec §6.7 says "profile-conditional chips appear only when a profile filter is selected" — confirm in QA-3 with screenshots.
