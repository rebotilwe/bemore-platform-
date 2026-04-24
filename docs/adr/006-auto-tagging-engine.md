# ADR-006: Pre-Save Hook Auto-Tagging Engine

## Status

Accepted

## Date

2026-02-05

## Context

The BeMore platform captures detailed application data through a multi-step form, including information about project readiness, funding requirements, land status, development experience, and operator scale. The admin team at BeMore needs to quickly identify and prioritise high-value leads for the PBSA funding partnership and summit deal room access.

Two approaches to lead classification were considered:

1. **Manual classification only**: Admins review each application and manually assign tags and classifications (hot/warm/cold). This was the initial approach but did not scale — with hundreds of applications arriving during the summit registration push, manual review created a bottleneck.
2. **Automated tagging with manual override**: An engine analyses `formData` on every save and assigns intelligence tags automatically. Admins can still manually set the `classification` field (hot/warm/cold) and add notes, but the tags provide an immediate first pass.

The tagging logic needed to be:
- Transparent: admins should understand why a tag was applied.
- Consistent: the same data should always produce the same tags.
- Extensible: new tags should be easy to add as business criteria evolve.
- Non-destructive: manual admin classifications should not be overwritten.

## Decision

Implement the auto-tagging engine as a Mongoose `pre('save')` middleware hook on the Application model. The hook runs on every save (create or update) and recomputes the `tags` array based on the current `formData`.

Tag categories and their criteria:

- **Value tags**: `HIGH_VALUE` (funding > R50M or large portfolio), `LARGE_CAPITAL` (funding > R100M), `MID_VALUE` (funding R10-50M).
- **Stage tags**: `LAND_SECURED` (owns land), `FUNDING_STAGE` (actively seeking funding), `SHOVEL_READY` (land secured + plans approved).
- **Composite tags**: `PIPELINE_READY` (land + funding + experience), `INSTITUTIONAL_GRADE` (large scale + track record + compliance).
- **Profile tags**: `EXPERIENCED` (5+ years), `STUDENT_FOCUS` (student accommodation operator), `LARGE_OPERATOR` (500+ beds), `REGISTERED` (company registered).

The engine is separate from the `classification` field, which remains admin-controlled. Tags are computed data; classification is human judgment.

Key implementation details:
- Tags are fully recomputed on every save, not incrementally updated. This ensures consistency when `formData` is modified.
- The `autoTag` utility function is a pure function that takes `formData` and `userType` and returns a tag array, making it independently testable.
- The pre-save hook calls `autoTag()` and assigns the result to `this.tags` before the document is persisted.
- Tags drive the analytics dashboard (tag distribution charts), report endpoints (high-value developers, pipeline-ready land, institutional-grade housing), and deal room shortlisting.

## Consequences

### Positive

- Immediate lead prioritisation: newly submitted applications are tagged within milliseconds, allowing admins to filter and sort by tag from the moment of submission.
- Consistent classification: the same form data always produces the same tags, eliminating human inconsistency in initial triage.
- Analytics accuracy: tag distribution charts and report endpoints reflect the full dataset, not just manually reviewed applications.
- Extensibility: adding a new tag requires adding a condition to the `autoTag` function and deploying. No data migration needed.
- Non-destructive: the engine only manages the `tags` array. The admin-controlled `classification` (hot/warm/cold), `adminNotes`, and `followUp` fields are untouched.
- Testability: the `autoTag` function is a pure function with no database dependencies, easily covered by unit tests.

### Negative

- Tag criteria are embedded in application code, not configurable by admins through the UI. Changing tag thresholds (e.g., what constitutes "high value") requires a code change and redeployment.
- Full recomputation on every save is slightly wasteful when only non-form fields change (e.g., status update). In practice, the computation is trivial (microseconds) so this is not a performance concern.
- Tags are derived data but stored in the database, creating a potential consistency gap if the tagging logic changes. Existing documents retain old tags until they are next saved. A bulk re-tag script would be needed for retroactive updates.

### Risks

- If tagging criteria become complex or require external data (e.g., querying a company registry API), the synchronous pre-save hook would need to be replaced with an asynchronous post-save job or event-driven pipeline.
- Business stakeholders may request admin-configurable tag rules (e.g., "tag as HIGH_VALUE if funding > RX where X is configurable"). This would require a rules engine or at minimum a settings-driven threshold system, beyond the current hardcoded approach.
- Over-reliance on auto-tags without human review could lead to false positives (e.g., an applicant exaggerating their funding needs being tagged as `HIGH_VALUE`). The admin classification field provides a counterbalance.
