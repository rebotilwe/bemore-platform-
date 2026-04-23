# ADR-003: Hash-Based SPA Routing

## Status

Accepted

## Date

2025-12-01

## Context

The BeMore frontend is a single-page application deployed to Vercel as static files. It needs client-side routing to navigate between public pages (registration form, landing, status lookup) and admin pages (dashboard, leads, analytics, reports, polls, settings).

Two routing strategies were considered:

1. **History API routing** (`/admin/dashboard`): Uses `pushState`/`popState` for clean URLs. Requires server-side configuration to rewrite all routes to `index.html` (e.g., Vercel `rewrites` in `vercel.json`).
2. **Hash-based routing** (`/#/admin/dashboard`): Uses the URL hash fragment (`window.location.hash`). The hash is never sent to the server, so all routes resolve to the same `index.html` without any server configuration.

Key constraints:

- The frontend is deployed to Vercel, which does support rewrites, but the `vercel.json` already contains rewrites for proxying `/api/*` requests to the Railway backend. Adding SPA fallback rewrites alongside API proxy rewrites adds configuration complexity and ordering sensitivity.
- The platform uses a service worker for PWA support. Hash-based routing is simpler for service workers because the navigation request is always for the same URL (`/index.html`).
- SEO is not a priority for this platform — it is an event-specific engagement tool, not a content site. Public pages are accessed via QR codes and direct links, not search engines.
- The custom router implementation needs to be minimal (no dependency on `react-router`, `vue-router`, etc.) since the frontend uses vanilla TypeScript.

## Decision

Use hash-based SPA routing with a custom router implementation in `src/router.ts`. Routes are defined as a map of hash paths to page render functions, with auth guard middleware for admin routes.

The router:

- Listens to `hashchange` events on `window`.
- Matches the current `location.hash` against registered routes.
- Supports route parameters (e.g., `/#/admin/applications/:id`).
- Enforces authentication for routes prefixed with `/admin/` (except `/admin/login`).
- Falls back to the home page for unmatched routes.

## Consequences

### Positive

- Zero server configuration required. Works on any static file host (Vercel, Netlify, S3, GitHub Pages) without rewrite rules.
- No conflict with the Vercel API proxy rewrites in `vercel.json`. The hash fragment is entirely client-side.
- Simpler service worker caching — all navigation requests hit the same cached `index.html`.
- Trivial implementation (~80 lines) with no external dependencies, fitting the vanilla TypeScript approach (ADR-001).
- Deep linking works out of the box — users can bookmark and share `/#/admin/leads` or `/#/register` URLs.
- QR codes can encode hash-based URLs with source tracking params (e.g., `https://bemore-tawny.vercel.app/?src=qr#/register`).

### Negative

- URLs contain `/#/` which looks less polished than clean paths. For an internal/event platform this is acceptable, but it would be a concern for a consumer-facing product.
- Hash fragments are not sent to the server, so server-side analytics (e.g., Vercel Web Analytics) cannot distinguish between routes without client-side instrumentation. The platform addresses this with its own client-side tracker (`src/services/tracker.ts`).
- Browser back/forward navigation works via `hashchange` but does not integrate with native scroll restoration. Pages scroll to top on navigation, which is the desired behavior for this application.
- Social media link previews and Open Graph tags cannot vary by route since the server always serves the same `index.html`. All meta tags reflect the home page.

### Risks

- If the platform later requires SSR (server-side rendering) for SEO or performance, hash-based routing would need to be replaced entirely with history-based routing. This would require reworking the router and Vercel configuration.
- Some enterprise proxy servers or security appliances strip URL fragments, which could break deep links in corporate network environments. This has not been observed in practice.
