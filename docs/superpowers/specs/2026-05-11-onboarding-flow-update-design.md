# Onboarding Flow Update — Design Spec

**Date:** 2026-05-11
**Owner:** Workstream C / Platform Engineering
**Source brief:** `New/MEMORANDUM - Onboarding Flows for All 6 Stakeholder Types.pdf` (Workstream C Team, BeMore Group, 4 May 2026)
**Status:** Draft — pending user approval before implementation
**Related:** `docs/superpowers/specs/2026-05-11-sprint-hardening-design.md`

---

## 1. Context & Purpose

The current BeMore onboarding form is a 5-step shell that asks shallow questions and collects contact details upfront. The Workstream C memorandum prescribes a richer per-profile question set following a 7-section "progressive questioning" pattern (Identity → Position → Activity → Constraints → Alignment → Contact → Feedback), with built-in **feedback capture for low-intent submitters**.

This spec defines how to deliver the new question sets across all 6 existing profiles **within the current 5-step UI shell**, with no rebrand, no new profiles, and no destructive migration of existing applications.

## 2. Goals

- Replace each profile's question set with the PDF's per-flow content.
- Defer contact capture to Step 4 (per the spec's "pull users forward naturally" principle).
- Add a universal **Feedback layer** in Step 5 that captures low-intent reasons.
- Add **intra-step conditional questions** (`showIf` predicates).
- Add **optional CV upload** for the Built Environment Professional flow.
- Update the **auto-tagging engine** to read the new field keys (server + client mirror in lockstep).
- Update **admin lead detail** and **leads list** to render the new fields and tags.
- Preserve all existing applications — no migration.

## 3. Non-goals (out of scope)

- Rebrand to Muma Consulting / Pormat Property Group (`New/newSpec.md` is explicitly **not** in scope for this update).
- New stakeholder profile types — keep the existing 6.
- Changes to gateway page (`/#/gateway`), about pages, success page, status page.
- Changes to Deal Room reports, summit-config logic, QR / source-tracking, traffic analytics.
- Server-side draft persistence.
- Virus scanning of CV uploads (deferred hardening).
- Migration of existing applications to the new shape.
- Changes to email templates beyond profile-aware sentence in submission confirmation.

## 4. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Reorder content within the existing 5-step shell. | Keep current UX (progress bar, nav, validation patterns). Smallest risk, satisfies the spec's *intent*. |
| D2 | Ship all 6 profiles in one update. | Single migration, single QA pass, no inter-profile UX drift during transition. |
| D3 | Existing applications keep old `formData`. No backfill. | Old data is rendered generically in admin; new submissions use new shape. Clean cutover, zero data loss. |
| D4 | CV upload stored as local files on a Railway persistent volume. | Honours preference for local folder. Volume survives deploys (Railway ephemeral fs would not). |
| D5 | Feedback layer lives at the start of Step 5, before consent. | One screen, low friction, preserves 5-step shell. |
| D6 | Intra-step conditional questions only (no full multi-step branching). | Covers all PDF cases (Land Owner Q7, Investor Q9, Pro Q15, Developer Q12). |
| D7 | Hybrid implementation: declarative per-profile question configs + shared renderer. | Spec-to-code 1-to-1 mapping; QA can diff configs against PDF; conditionals colocated with questions. |
| D8 | Removed legacy tags stay on old documents but are hidden in admin UI. | No destructive update; admin chip list stays clean. |
| D9 | Composite "deal-room" tags (`PIPELINE_READY`, `HOT_INVESTOR`, `INSTITUTIONAL_OPERATOR`) retained, redefined against new fields. | Existing Deal Room reports keep working. |

---

## 5. Form Structure — Step Mapping

Every profile uses the same 5-step shell. Step 1 is always Identity, Step 4 is always Contact, Step 5 is always Feedback + Consent. Steps 2 and 3 absorb profile-specific content.

| Step | Standard role | Developer | Land Owner | Investor | Operator | Professional | Aspiring |
|---|---|---|---|---|---|---|---|
| **1 — Identity** | Name + entity | Q1 Name/Co, Q2 Indiv/Co | Q1 Name | Q1 Name/Entity, Q2 Indiv/Co | Q1 Name, Q2 Company | Q1 Name, Q2 Primary role | Q1 Name |
| **2 — Position + Activity** | Where they are today | Q3 Stage, Q4 Dev types, Q5 Project value | Q2 Location, Q3 Size, **Q4 Outcome (intent)** | Q3 Opportunity types, Q4 Range, Q5 How invest | Q3 Portfolio size, Q4 Locations, Q5 Op challenge | Q3 Experience, Q4 Provinces, Q5 Indep/Firm, Q6 Company | Q2 Involved before, Q3 Land access, Q4 Dev type |
| **3 — Constraints + Alignment** | Blockers + what matters | Q6 Funding pos, Q7 Constraint, Q8 What matters | Q5 Zoning, Q6 Started work, Q7 What prevents progress | Q6 Decision drivers, Q7 Capital deployment | Q6 Occupancy, Q7 Scale limits | Q7 Project types, Q8 Project size, Q9 Work style, Q10 What matters | Q5 Holding back, Q6 Realistic start |
| **4 — Contact** | Phone + email (+CV for Pro) | Q9 Phone, Q10 Email | Q8 Phone, Q9 Email | Q8 Phone, Q9 Email | Q8 Phone, Q9 Email | Q11 Phone, Q12 Email, **Q13 CV upload (opt)** | Q7 Phone, Q8 Email |
| **5 — Feedback + Consent** | Final intent capture | Q11 How actively, **Q12 What's holding back (if not active)**, Consent | Q10 What would make you comfortable, Consent | Q10 What's limiting (**if Q7≠Active**), Consent | Q10 What support helps, Consent | Q14 How actively, **Q15 Why not (if not active)**, Consent | Q9 What support helps, Consent |

### 5.1 Conditional questions — full list

| Profile | Step | Question | Show if |
|---|---|---|---|
| Developer | 5 | Q12 What's holding back | `activityLevel === 'Longer term'` OR `activityLevel === 'Within 3–6 months'` |
| Land Owner | 3 | Q5 Zoning, Q7 Preventing progress | `landOutcome ∈ {'Sell', 'Develop', 'Partner', 'Generate income'}` (i.e. NOT `'Exploring'`) — softens the form for browsers |
| Investor | 5 | Q10 What's limiting | `capitalDeployment ∈ {'Selective', 'Not currently'}` |
| Professional | 5 | Q15 Why not actively looking | `activityLookingNow ∈ {'Open to the right opportunity', 'Not actively looking'}` |

> **Land Owner softening** — the PDF doesn't explicitly conditionalise zoning/preventing-progress on intent, but Q4 Outcome includes `'Exploring'`. We treat Exploring as low-commitment and don't force them through Q5/Q7. Confirm during QA.

---

## 6. Component / UI Contract

### 6.1 File layout (frontend)

```
frontend/src/
├── constants/
│   ├── form-steps.ts                  # 5-step labels (existing, retitled)
│   └── profiles/                      # NEW — per-profile question configs
│       ├── developer.questions.ts
│       ├── landowner.questions.ts
│       ├── investor.questions.ts
│       ├── student.questions.ts
│       ├── professional.questions.ts
│       └── aspiring.questions.ts
├── components/
│   └── question-group.ts              # NEW — shared renderer
├── pages/public/
│   └── form-steps/                    # existing 5 step files become THIN
│       ├── step-identity.ts           # renamed from step-basic.ts
│       ├── step-position.ts           # renamed from step-readiness.ts
│       ├── step-constraints.ts        # renamed from step-funding.ts
│       ├── step-contact.ts            # renamed from step-project.ts
│       └── step-feedback-consent.ts   # renamed from step-confirm.ts
└── types/
    └── question.ts                    # NEW — Question, ProfileQuestions types
```

### 6.2 Question schema

```ts
type QuestionType =
  | 'text' | 'email' | 'phone' | 'textarea'
  | 'radio' | 'checkbox' | 'dropdown' | 'file';

interface Question {
  id: string;                                // formData key
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  otherField?: { id: string; label: string }; // for "Other: ___"
  showIf?: (formData: Record<string, unknown>) => boolean;
  validate?: (value: unknown) => string | null;
  placeholder?: string;
  helpText?: string;
  accept?: string;                            // file inputs: comma-separated mime types
  maxSizeBytes?: number;                      // file inputs only
}

interface ProfileQuestions {
  step1: Question[];   // Identity
  step2: Question[];   // Position + Activity
  step3: Question[];   // Constraints + Alignment
  step4: Question[];   // Contact (+ optional CV for Pro)
  step5: Question[];   // Feedback (consent rendered separately)
}
```

### 6.3 Shared renderer contract

```ts
function renderQuestionGroup(
  questions: Question[],
  formData: Record<string, unknown>,
  onChange: (id: string, value: unknown) => void
): HTMLElement;
```

- Iterates `questions`, evaluates `showIf` per question, renders the right input.
- Inputs share consistent styling (existing tokens), validation messages, ARIA attributes.
- `onChange` writes to the reactive store; conditionals re-evaluate on next step re-render.

### 6.4 Step-readiness contract

```ts
function nextStepReady(
  stepIndex: number,
  profile: ProfileCategory,
  formData: Record<string, unknown>
): boolean;
```

- Walks the visible questions for that step (respects `showIf`).
- Runs each `validate`.
- Returns `true` only if all pass.
- Drives the "Next" button enable/disable state.

### 6.5 UI states (must render)

| State | Trigger | Behaviour |
|---|---|---|
| Loading | Initial page load | Existing skeleton stays |
| Question hidden by `showIf` | Predicate returns false | Question not rendered, value cleared from formData |
| Validation error | `validate()` returns string | Error text under input, input border red, "Next" disabled |
| File upload in progress | After file selected | Spinner on upload button, "Next" disabled until upload completes |
| File upload error | Server returns 4xx/5xx | Error toast, file selection cleared, allow retry |
| File uploaded | Server returns success | Filename + size shown, "Remove" link, "Next" re-enabled |
| Empty (admin lead-detail) | `formData` for old profile is empty | Empty state: "No additional information captured" |

### 6.6 Admin lead detail contract

- Renders `formData` via per-profile `PROFILE_FIELD_LABELS[profile][fieldKey]` map.
- Unknown keys (legacy fields on old applications) fall through to `humanise(key)`.
- Three logical sections: *Position & Activity*, *Constraints & Alignment*, *Feedback*.
- **Activity badge** at top: gold = `ACTIVELY_LOOKING`, neutral = `OPEN_TO_OPPORTUNITY`, grey = `LOW_INTENT`.
- **CV download button** for Professional applications with attachments — calls `GET /api/applications/:refNumber/attachment/:storedAs`.

### 6.7 Admin leads list contract

- **Filter chips** (replace current tag chips):
  - Always-visible: `Actively looking`, `Open`, `Low intent`, `Pipeline ready`, `Hot investor`, `Institutional operator`.
  - Profile-conditional: appear only when a profile filter is selected (e.g. selecting "Land Owner" reveals `Sellers`, `Developers`, `JV`, `Income`).
- Legacy tags listed in §8.5 never render as chips and never appear on lead cards.
- **CSV export** column set updates per §6.8.

### 6.8 CSV export columns

Universal columns (every row): `refNumber, userType, firstName, surname, email, phone, status, classification, activityLevel, feedback, createdAt, tags`.

Profile-conditional columns (only emitted when at least one application of that profile exists in the export):
- developer: `developmentStage, projectValue, fundingPosition, biggestConstraint`
- landowner: `landLocation, landSize, landOutcome, zoning`
- investor: `investmentRange, investmentApproach, capitalDeployment`
- student: `portfolioSize, occupancyLevel, opChallenge`
- professional: `primaryRole, experienceLevel, provinces, avgProjectSize, hasCv`
- aspiring: `hasLandAccess, holdingBack, realisticStart`

Old applications missing a column render the cell empty. Formula-injection prefix protection (existing) stays.

---

## 7. Data Model / Schema Contract

### 7.1 `Application` model — additions

```js
// backend/src/models/Application.js
{
  // ...existing fields unchanged...

  attachments: [{
    field:      { type: String, required: true },     // 'cv' for Professional Q13
    filename:   { type: String, required: true },     // sanitised original name
    storedAs:   { type: String, required: true },     // UUID-based filename on disk
    size:       { type: Number, required: true },
    mimeType:   { type: String, required: true },
    uploadedAt: { type: Date,   default: Date.now },
  }]
}
```

- `attachments` defaults to `[]`. Existing documents unaffected.
- Indexes: none new (attachments queried only via parent `refNumber`).
- TTL: parent `Application` already has 24-month TTL; nightly cron sweeps orphaned files (see §11.3).
- POPIA register: `attachments[].filename` is PII (may include person's name). Stored encrypted-at-rest via Railway disk encryption.

### 7.2 `formData` field naming convention

`camelCase`, prefixed by intent. Universal Step-5 fields use the same key on every profile.

| Concept | Field key | Type | Required | Profiles |
|---|---|---|---|---|
| Development stage | `developmentStage` | string | Y | developer |
| Development types | `developmentTypes` | string[] | Y | developer |
| Project value bracket | `projectValue` | string | Y | developer |
| Funding position | `fundingPosition` | string | Y | developer |
| Biggest constraint | `biggestConstraint` | string | Y | developer |
| Constraint other | `biggestConstraintOther` | string | conditional | developer |
| What matters when evaluating | `whatMatters` | string[] | Y | developer |
| Land location | `landLocation` | string | Y | landowner |
| Land size | `landSize` | string | Y | landowner |
| Land outcome (intent) | `landOutcome` | string | Y | landowner |
| Zoning | `zoning` | string | conditional | landowner |
| Started development work | `startedDevWork` | string | conditional | landowner |
| What prevents progress | `whatPreventsProgress` | string | conditional | landowner |
| Investment opportunities | `investmentOpportunities` | string[] | Y | investor |
| Investment range | `investmentRange` | string | Y | investor |
| Investment approach | `investmentApproach` | string[] | Y | investor |
| Decision drivers | `decisionDrivers` | string[] | Y | investor |
| Capital deployment | `capitalDeployment` | string | Y | investor |
| Portfolio size (beds) | `portfolioSize` | string | Y | student |
| Locations | `portfolioLocations` | string[] | Y | student |
| Operational challenge | `opChallenge` | string | Y | student |
| Occupancy level | `occupancyLevel` | string | Y | student |
| Scale limit | `scaleLimit` | string | Y | student |
| Primary role | `primaryRole` | string | Y | professional |
| Experience level | `experienceLevel` | string | Y | professional |
| Provinces | `provinces` | string[] | Y | professional |
| Work structure | `workStructure` | string | Y | professional |
| Company / practice | `companyPractice` | string | N | professional |
| Project types | `projectTypes` | string[] | Y | professional |
| Avg project size | `avgProjectSize` | string | Y | professional |
| Work style | `workStyle` | string | Y | professional |
| What matters (Pro) | `proWhatMatters` | string[] | Y | professional |
| Active looking now | `activityLookingNow` | string | Y | professional |
| Why not looking | `whyNotLooking` | string | conditional | professional |
| Involved in dev before | `involvedBefore` | string | Y | aspiring |
| Land access | `hasLandAccess` | string | Y | aspiring |
| Aspiring dev type | `aspiringDevType` | string | Y | aspiring |
| Holding back | `holdingBack` | string | Y | aspiring |
| Realistic start | `realisticStart` | string | Y | aspiring |
| **Activity level (universal)** | `activityLevel` | string | Y | all |
| **Feedback (universal)** | `feedback` | string | Y | all |
| **Why not active (universal)** | `notActiveReason` | string | conditional | all |

`personal.firstName`, `personal.surname`, `personal.email`, `personal.phone`, `personal.companyName` keep their existing top-level placement (not in `formData`). Step 1 writes `firstName`/`surname` directly to `personal`; Step 4 writes `email`/`phone` directly to `personal`.

### 7.3 File storage

```
/app/uploads/cv/{uuid}.{ext}        # Railway persistent volume mount
```

- Volume mounted at `/app/uploads`, size 1 GB initial allocation (≈$0.25/mo).
- Single-instance only — backend already runs as one Railway service.
- File naming: `${crypto.randomUUID()}.${sanitisedExt}`. Original filename preserved only in the `attachments[].filename` DB field.
- Permissions: `0644` files, `0755` directories. Process user owns the volume.
- **Survives deploys:** Railway volume persistence verified during staging soak (see §10.4).

---

## 8. API Contract

### 8.1 New endpoint — `POST /api/applications/upload`

| Property | Value |
|---|---|
| Auth | Public + CSRF token required |
| Rate limit | Public limiter (100 req / 15 min per IP) |
| Content-Type | `multipart/form-data` |
| Body field | `file` (single file) |
| Accepted MIME types | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Max file size | 5 MB (5 × 1024 × 1024 bytes) |

**Success — 200:**
```json
{
  "filename": "alex-soko-cv.pdf",
  "storedAs": "9f3c1b8a-….pdf",
  "size": 124358,
  "mimeType": "application/pdf"
}
```

**Errors:**
| Status | Code | When |
|---|---|---|
| 400 | `NO_FILE` | No file in request |
| 400 | `FILE_TOO_LARGE` | File > 5 MB |
| 400 | `INVALID_MIME_TYPE` | MIME type not in whitelist |
| 403 | `CSRF_INVALID` | Missing/invalid CSRF token |
| 429 | `RATE_LIMITED` | Public limiter triggered |
| 500 | `STORAGE_ERROR` | Disk write failed (volume full, permissions) |

**Side effects:** writes file to `/app/uploads/cv/{storedAs}`. No DB write yet — file is "pending" until referenced by a successful `POST /api/applications` body.

**Acceptance criteria:**
- ✅ Upload with valid PDF returns 200 with the four fields.
- ✅ Upload > 5 MB returns 400 `FILE_TOO_LARGE`.
- ✅ Upload `image/png` returns 400 `INVALID_MIME_TYPE`.
- ✅ Upload without CSRF returns 403.
- ✅ Filename in response equals `path.basename(originalname)` with non-`[a-zA-Z0-9 ._-]` chars stripped.
- ✅ `storedAs` is a UUID v4 with original extension.
- ✅ File written to disk at `/app/uploads/cv/{storedAs}` with mode `0644`.

### 8.2 Modified endpoint — `POST /api/applications`

**Change:** request body accepts a new `attachments[]` field (optional). Each item must reference a `storedAs` that exists on disk in the upload directory.

**Body addition:**
```json
{
  "attachments": [
    { "field": "cv", "storedAs": "9f3c1b8a-….pdf" }
  ]
}
```

**New errors:**
| Status | Code | When |
|---|---|---|
| 400 | `ATTACHMENT_NOT_FOUND` | `storedAs` does not exist on disk |
| 400 | `ATTACHMENT_FIELD_INVALID` | `field` not in allowed list (`['cv']`) |

**Acceptance criteria:**
- ✅ Submitting with valid `attachments[0].storedAs` persists full attachment metadata (filename, size, mimeType inferred from disk).
- ✅ Submitting with non-existent `storedAs` returns 400 `ATTACHMENT_NOT_FOUND`; uploaded file (if any) is left on disk for cleanup.
- ✅ Submitting without `attachments` works as today.

### 8.3 New endpoint — `GET /api/applications/:refNumber/attachment/:storedAs`

| Property | Value |
|---|---|
| Auth | JWT required (admin) |
| Rate limit | Admin limiter (300 req / 15 min per IP) |
| Response | File stream with `Content-Disposition: attachment; filename="<original>"` |

**Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| 404 | `APPLICATION_NOT_FOUND` | No application with `refNumber` |
| 404 | `ATTACHMENT_NOT_FOUND` | Application has no attachment with `storedAs` |
| 410 | `FILE_MISSING_ON_DISK` | DB references file but disk doesn't have it |

**Side effects:** writes one entry to `AdminAuditLog` with action `attachment.download`, target `refNumber`, metadata `{ storedAs, filename }`.

**Acceptance criteria:**
- ✅ Admin downloads CV → 200 + correct file bytes + `Content-Disposition: attachment; filename="alex-soko-cv.pdf"`.
- ✅ Non-admin → 401.
- ✅ Wrong refNumber → 404 `APPLICATION_NOT_FOUND`.
- ✅ Wrong storedAs → 404 `ATTACHMENT_NOT_FOUND`.
- ✅ DB has reference but file deleted from disk → 410 `FILE_MISSING_ON_DISK`, alert logged.
- ✅ One `AdminAuditLog` entry written per successful download.

### 8.4 New endpoint — `DELETE /api/applications/:refNumber/attachment/:storedAs`

| Property | Value |
|---|---|
| Auth | JWT required (admin) |
| Rate limit | Admin limiter |
| Body | none |
| Response | 204 No Content |

**Side effects:** removes the file from disk, removes the entry from `attachments[]`, writes `AdminAuditLog` entry with action `attachment.delete`.

**Acceptance criteria:**
- ✅ Removes file + DB entry + writes audit log.
- ✅ Idempotent: deleting an already-deleted attachment returns 404, no further side effects.
- ✅ Disk delete failure does not block DB delete (file stays orphaned, alert logged, sweeper picks it up).

### 8.5 Modified endpoint — `POST /api/applications/data-export`

**Change:** response includes `attachments[]` metadata + short-lived signed download links.

**Signing scheme:**
- `downloadUrl = /api/applications/{refNumber}/attachment/{storedAs}/signed?expires={unix}&sig={hmac}`
- `sig = HMAC-SHA256(JWT_SECRET, "${refNumber}|${storedAs}|${expires}")` (hex-encoded)
- `expires = Math.floor(Date.now()/1000) + 300` (5 min)
- Signed-link endpoint is **public** (no JWT required) but rejects on bad signature or expiry. This is so applicants can download their own data without an admin session.

**Acceptance criteria:**
- ✅ Response includes `attachments[]` with `filename`, `size`, `mimeType`, `downloadUrl`.
- ✅ `downloadUrl` returns 200 within 5 minutes of issue, file bytes match.
- ✅ `downloadUrl` returns 410 `LINK_EXPIRED` after 5 minutes.
- ✅ Tampering with `expires` or `storedAs` in the URL returns 403 `BAD_SIGNATURE`.
- ✅ One `AdminAuditLog` entry written per signed-link download (action `attachment.signed-download`, no admin user — log `actor: 'self-service'`).

### 8.6 Modified endpoint — `POST /api/applications/data-delete`

**Change:** deletes attached files from disk in the same operation as the DB delete. If disk delete fails, log + alert but proceed with DB delete (POPIA right-to-erasure trumps file persistence).

**Acceptance criteria:**
- ✅ Calling data-delete with valid refNumber + email removes both DB record and all attachment files.
- ✅ If file already missing on disk, operation succeeds and logs warning.
- ✅ If disk delete fails, DB record still deleted, error logged.

### 8.7 OpenAPI spec

Update `docs/api/openapi.yaml`:
- Add `POST /applications/upload`, `GET /applications/{refNumber}/attachment/{storedAs}`, `DELETE /applications/{refNumber}/attachment/{storedAs}`.
- Update `Application` schema with `attachments[]`.
- Update `POST /applications` request schema with optional `attachments[]`.

---

## 9. Auto-Tagging Engine

Mongoose `pre('save')` hook on `Application` — runs only on `isNew`. Mirror engine in `frontend/src/utils/auto-tag.ts`. Both engines fed by a single shared rule list (or two lists kept in sync via cross-engine parity test).

### 9.1 Universal tags

| Tag | Rule |
|---|---|
| `ACTIVELY_LOOKING` | `activityLevel ∈ {'Immediately', 'Active', 'Actively looking'}` |
| `OPEN_TO_OPPORTUNITY` | `activityLevel ∈ {'Within 3–6 months', 'Selective', 'Open to the right opportunity'}` |
| `LOW_INTENT` | `activityLevel ∈ {'Longer term', 'Not currently', 'Not actively looking'}` |

### 9.2 Per-profile tags

(See §4 of the design conversation; full rule list below for implementation reference.)

| Profile | Tag | Rule |
|---|---|---|
| developer | `SHOVEL_READY` | `developmentStage ∈ {'Construction-ready', 'Under construction'}` |
| developer | `FUNDING_GAP` | `fundingPosition ∈ {'No funding secured', 'In discussions'}` |
| developer | `HIGH_VALUE` | `projectValue ∈ {'R20M–R100M', 'R100M+'}` |
| developer | `STUDENT_FOCUS` | `developmentTypes` includes `'Student Accommodation'` |
| landowner | `LAND_SELLER` | `landOutcome === 'Sell'` |
| landowner | `LAND_DEVELOPER` | `landOutcome === 'Develop'` |
| landowner | `LAND_JV` | `landOutcome === 'Partner'` |
| landowner | `LAND_INCOME` | `landOutcome === 'Generate income'` |
| landowner | `WORK_STARTED` | `startedDevWork === 'Yes'` |
| investor | `LARGE_INVESTOR` | `investmentRange ∈ {'R10M–R20M', 'R20M+'}` |
| investor | `EQUITY_INVESTOR` | `investmentApproach` includes `'Equity'` |
| investor | `DEBT_FUNDER` | `investmentApproach` includes `'Debt'` |
| investor | `JV_PARTNER` | `investmentApproach` includes `'JV'` |
| investor | `ACTIVE_DEPLOYER` | `capitalDeployment === 'Active'` |
| student | `LARGE_OPERATOR` | `portfolioSize === '500+ beds'` |
| student | `MID_OPERATOR` | `portfolioSize ∈ {'51–200 beds', '201–500 beds'}` |
| student | `HIGH_OCCUPANCY` | `occupancyLevel ∈ {'Above 90%', 'High'}` |
| student | `GROWTH_FOCUS` | `opChallenge === 'Growth'` |
| professional | `SENIOR_PRO` | `experienceLevel === 'Senior (10+ years)'` |
| professional | `MULTI_PROVINCE` | `provinces.length >= 3` |
| professional | `STUDENT_ACC_EXP` | `projectTypes` includes `'Student Accommodation'` |
| professional | `MAJOR_PROJECTS` | `avgProjectSize === 'Major (R50M+)'` |
| professional | `INDEPENDENT` | `workStructure === 'Independent'` |
| aspiring | `HAS_LAND` | `hasLandAccess === 'Yes'` |
| aspiring | `READY_NOW` | `realisticStart === 'Immediately'` |
| aspiring | `NEEDS_FUNDING` | `holdingBack === 'Funding'` |
| aspiring | `NEEDS_KNOWLEDGE` | `holdingBack === 'Knowledge'` |

### 9.3 Composite "deal-room" signals

| Tag | Rule |
|---|---|
| `PIPELINE_READY` | developer with `SHOVEL_READY` AND `HIGH_VALUE` AND `ACTIVELY_LOOKING` |
| `HOT_INVESTOR` | investor with `LARGE_INVESTOR` AND `ACTIVE_DEPLOYER` |
| `INSTITUTIONAL_OPERATOR` | student with `LARGE_OPERATOR` AND `HIGH_OCCUPANCY` |

### 9.4 Additional composite — `INSTITUTIONAL_GRADE`

Distinct from `PIPELINE_READY` (kept separate because the existing Deal Room report queries them independently).

| Tag | Rule |
|---|---|
| `INSTITUTIONAL_GRADE` | developer with `HIGH_VALUE` AND `STUDENT_FOCUS` |

### 9.5 Removed tags (legacy, no new emission)

`LAND_SECURED`, `FUNDING_STAGE`, `MID_VALUE`, `SEEKS_EQUITY`, `SEEKS_DEBT`, `FUNDED_BEFORE`, `INSTITUTIONAL_TRACK`, `EXPERIENCED`, `UNI_ACCREDITED`, `NSFAS_ACCREDITED`, `REGISTERED`, `LARGE_SCALE`, `INVESTOR`.

These remain on existing documents but never appear on new submissions, never render as filter chips, never render as lead-card badges.

### 9.6 Acceptance criteria

- ✅ One unit test per rule (server + client).
- ✅ Cross-engine parity test: 6 fixtures (one per profile) → identical tag arrays from server + client engines.
- ✅ Submitting an application with no relevant fields produces `[]` tags (not crash, not stray tags).
- ✅ Composite `PIPELINE_READY` only fires if all three contributing tags are present.
- ✅ Existing applications (with old field shapes) fed into new engine produce empty new tags but retain their original tag arrays.

---

## 10. Migration & Rollout

### 10.1 No DB migration

No schema migration is required. The schema change (`attachments[]`) is additive with a default of `[]`. No data backfill, no script, no maintenance window.

### 10.2 Railway volume bootstrap (one-time)

DevOps task. Order:
1. Provision a 1 GB volume on the staging Railway project, mount at `/app/uploads`.
2. Provision a 1 GB volume on the production Railway project, mount at `/app/uploads`.
3. Verify mount on staging (deploy a no-op build, exec `ls /app/uploads`).
4. Verify volume survives a redeploy (touch a file, redeploy, file present).

### 10.3 Deploy order

1. **Backend deploys first.** New endpoints + `attachments[]` schema field land. Frontend hasn't shipped yet → no client uses them. Existing `POST /api/applications` keeps working.
2. **Frontend deploys second.** New question configs + renderer + thin step files. New form hits new endpoints. Old `formData` keys never read by new form, so no input collision.
3. **Admin UI updates ship in the same frontend deploy.** Generic renderer + new chip set. Old applications still display via fallback.

### 10.4 Staging soak (mandatory before prod)

Before promoting staging → main:
- Submit one application per profile (6 total). Verify each:
  - Saves with new `formData` keys.
  - Auto-tags applied correctly (server logs show tag list).
  - Lead detail renders all fields with proper labels.
  - Activity badge shows correct colour.
  - CSV export includes new universal columns + per-profile columns.
- Submit a Professional application with CV upload. Verify:
  - File uploads, returns 200.
  - Application persists with `attachments[0]`.
  - Admin can download CV.
  - File survives a Railway redeploy of staging.
  - `POST /api/applications/data-delete` removes file from disk.
- Open one legacy application in admin. Verify:
  - Old `formData` keys render via fallback humaniser.
  - Legacy tags (e.g. `LAND_SECURED`) do NOT appear as filter chips or card badges.

### 10.5 Production cutover

After staging soak passes:
1. Merge `staging` → `main` (squash).
2. Verify `frontend/vercel.json` rewrite still points to `bemore-production.up.railway.app` (per CLAUDE.md post-merge warning).
3. Vercel auto-deploys frontend.
4. Railway auto-deploys backend.
5. Post-deploy smoke: hit `/api/health`, submit one test application per profile, delete after.

### 10.6 Rollback plan

- **Backend rollback:** Railway one-click rollback to previous deploy. New endpoints disappear. No data loss — old data untouched, new submissions from new frontend will fail with 404 on upload until frontend also rolls back.
- **Frontend rollback:** Vercel one-click rollback to previous deploy. Old form re-appears. New submissions made between deploy and rollback persist with new `formData` shape — display via legacy fallback in admin.
- **File volume:** never delete the volume on rollback. Files persist regardless of code state.

---

## 11. Testing Strategy

### 11.1 Frontend (vitest)

- One unit test per `Question.validate` (text length, phone SA format, email format, required behaviour).
- One test per profile config: walk all 5 steps, assert step has expected question IDs, assert each `showIf` predicate fires correctly.
- `<QuestionGroup>` renderer: mount with fixture, simulate input, assert `onChange` called with correct `(id, value)`.
- `nextStepReady` per profile × per step (12 tests): complete fixture → true; incomplete → false; conditional-required-when-shown → true/false.
- E2E happy path per profile (6 tests): fill all 5 steps, submit, assert API called with correct shape.

### 11.2 Backend (jest + mongodb-memory-server)

- One unit test per auto-tag rule (input → expected tag set).
- Cross-engine parity test (single test, 6 fixtures).
- Endpoint tests for all four new/modified endpoints, covering every error case in §8.1–8.6.
- POPIA: data-export includes attachment metadata + valid signed link; data-delete removes files from disk.
- Schema test: `attachments[]` defaults to empty; old documents loaded without crash.

### 11.3 File storage tests

- Sweeper: nightly cron sweeps files in `/app/uploads/cv/` not referenced by any `Application.attachments[].storedAs`. Test with seeded orphaned file → swept after run.
- Upload validates max size + mime type + sanitises filename.
- Concurrent uploads with same filename → different `storedAs` UUIDs, no collision.

### 11.4 Manual QA checklist (post-deploy)

- [ ] Each of 6 profiles can complete the form end-to-end.
- [ ] Conditional questions hide/show correctly.
- [ ] Step "Next" disables until all visible required fields filled.
- [ ] Activity badge colour matches `activityLevel`.
- [ ] Admin can view, filter, export, and (for Pro) download CV.
- [ ] Old applications still display correctly with fallback labels.
- [ ] No removed tags appear in admin UI.
- [ ] Email submission confirmation includes profile-aware sentence.
- [ ] `POST /api/applications/data-delete` removes attached files.

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Railway volume mis-mounted → uploads vanish on redeploy | Low (after staging soak) | Mandatory staging redeploy verification (§10.4). |
| Server + client auto-tag engines drift | Medium | Cross-engine parity test in CI catches mismatches. |
| Conditional questions don't re-render on dependency change | Low | Renderer subscribes to store; whole-step re-render on field change. Explicit test fixture. |
| New `formData` keys break existing analytics aggregations | Medium | Audit `analyticsService.js` and `trafficService.js` for hard-coded field names; update or fall back. Listed as architect task. |
| CV upload abused (large/malicious files) | Low | 5 MB cap + mime whitelist + rate limit. Virus scanning deferred. |
| Existing in-flight applications (drafts started before deploy) lose state | Low | We don't persist drafts server-side. Acceptable given small user base. |
| Admin lead detail crashes on legacy `formData` shape | Medium | Generic renderer with `humanise()` fallback; explicit test with legacy fixture. |
| Removed tags re-appear in admin UI accidentally | Low | Hidden via explicit blocklist constant; one test asserts no chip rendered. |

---

## 13. Documentation Deliverables (Docs agent owns)

After implementation + QA approval:
- `CLAUDE.md` — update *Profile-Aware Form*, *Auto-Tagging Engine*, *Application Data Model* sections.
- `docs/api/openapi.yaml` — add the three new endpoints, update `Application` and `POST /applications` schemas.
- `docs/SCHEMA.md` — add `attachments[]` field; document new `formData` keys per profile.
- `docs/architecture.md` — note declarative question config + shared renderer pattern.
- `docs/adr/0009-declarative-question-configs.md` — new ADR.
- `docs/compliance/popia.md` — note attachment data-export and data-delete behaviour.
- `docs/runbooks/deployment.md` — add Railway volume bootstrap step.

---

## 14. Open Questions (None blocking)

- Should the *Land Owner* "Exploring" softening (Step 3 conditional) be reviewed by Workstream C before ship, or is this our call? Default: our call, flag in QA notes.
- Naming consistency: PDF uses "Active / Selective / Not currently" for investors but "Actively looking / Open / Not actively looking" for professionals. Universal `activityLevel` enum normalises these. Confirm wording with Workstream C before shipping.

---

## 15. Done When (acceptance summary)

- [ ] All 6 profiles render the new question set per §5.
- [ ] All conditional questions in §5.1 fire correctly.
- [ ] Backend exposes the four endpoint contracts in §8 with all listed acceptance criteria green.
- [ ] Auto-tag engine emits exactly the §9.1–9.3 tags for new submissions, never any §9.5 tags.
- [ ] Cross-engine parity test green.
- [ ] Admin lead detail renders both new and legacy applications correctly.
- [ ] Admin filter chips show only the new chip set per §6.7.
- [ ] CSV export emits universal + per-profile columns per §6.8.
- [ ] CV upload works end-to-end on staging, persists across one Railway redeploy.
- [ ] Data-export + data-delete handle attachments per §8.5–8.6.
- [ ] All tests in §11.1–11.3 green; manual QA checklist §11.4 signed off.
- [ ] All Docs deliverables in §13 committed.
- [ ] `frontend/vercel.json` post-merge sanity check passed (production points to production Railway).
