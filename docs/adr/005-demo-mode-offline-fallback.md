# ADR-005: Demo Mode with localStorage Offline Fallback

## Status

Accepted

## Date

2026-01-20

## Context

The BeMore platform is designed for use at live events, including the summit at Sandton Convention Centre (30-31 March 2026). Live event environments present several connectivity challenges:

- Venue Wi-Fi may be congested with hundreds of simultaneous users.
- Mobile data coverage inside convention centres is often unreliable.
- South Africa experiences load shedding (scheduled power outages) that can take down connectivity infrastructure.
- The platform must be demonstrable to stakeholders at any time, including during sales meetings or presentations where internet access may not be available.
- Railway backend downtime (however rare) should not prevent the frontend from functioning for demos or form submissions.

The team needed a strategy to keep the application functional when the backend API is unreachable.

## Decision

Implement an automatic demo mode in the frontend API client (`src/api.ts`) that detects backend availability and falls back to `localStorage` for full CRUD operations.

The implementation works as follows:

1. On application startup, `main.ts` makes a `GET /api/health` request to the backend.
2. If the health check fails (network error, timeout, non-200 response), the app enters demo mode.
3. In demo mode, the API client (`src/api.ts`) intercepts all API calls and redirects them to `localStorage`:
   - `POST /api/applications` stores the application in `localStorage` with a generated `BM-XXXXXXXX` reference number.
   - `GET /api/applications` reads from `localStorage` with client-side filtering and pagination.
   - `PATCH /api/applications/:id` updates the local record.
   - `GET /api/applications/stats` computes statistics from local data.
   - Admin authentication uses hardcoded demo credentials.
4. A persistent banner indicates demo mode is active.
5. The service worker (v2) caches the app shell, logo, and icons for offline access using a stale-while-revalidate strategy.
6. When connectivity is restored, the app can be refreshed to exit demo mode. Data created in demo mode remains in `localStorage` but is not automatically synced to the server.

## Consequences

### Positive

- The platform is always demonstrable, regardless of connectivity. Sales meetings, investor presentations, and venue walkthroughs can proceed without internet.
- Form submissions at the summit are not lost if the backend is temporarily down. Users receive a reference number and can see their submission locally.
- Load shedding resilience: the platform remains functional during power outages affecting infrastructure.
- Zero additional infrastructure required — `localStorage` is available in all modern browsers.
- The service worker ensures the app loads even when fully offline (cached HTML, CSS, JS, and assets).
- Clean separation: the API client's fallback logic is isolated in `src/api.ts`, not spread across page components.

### Negative

- Data created in demo mode is not synced to the server. Submissions made offline would need to be re-entered or manually imported when connectivity is restored.
- `localStorage` has a 5-10 MB limit (browser-dependent). For a high-volume event with hundreds of offline submissions, this could be exceeded.
- Analytics, email notifications, and auto-tagging do not function in demo mode — these are server-side features.
- Admin features that depend on aggregation pipelines (analytics dashboards, reports) show limited or mock data in demo mode.
- The demo mode banner may confuse users who do not understand why the platform is in a degraded state.

### Risks

- Users may submit applications in demo mode and believe they are officially registered, when in fact the data only exists in their browser's `localStorage`. Clear messaging about demo mode limitations is important.
- If a sync mechanism is later added (uploading localStorage data to the server when connectivity returns), conflict resolution between local and server data would need careful handling (duplicate reference numbers, stale data).
- `localStorage` is domain-scoped and unencrypted. Sensitive application data (names, emails, phone numbers) stored in demo mode is accessible to any script on the same domain. This is acceptable for a short-lived event platform but would require IndexedDB with encryption for a long-term solution.
