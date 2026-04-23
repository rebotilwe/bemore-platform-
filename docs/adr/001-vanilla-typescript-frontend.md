# ADR-001: Vanilla TypeScript Frontend (No Framework)

## Status

Accepted

## Date

2025-11-15

## Context

BeMore is a live engagement and data capture platform for the BeMore SME Access Initiative, connecting South African property developers and built environment professionals with institutional funding partnerships. The frontend needed to serve both public-facing registration forms and an admin dashboard with analytics, lead management, polls, and reporting.

The team evaluated React, Vue, Svelte, and vanilla TypeScript for the frontend. Key considerations included:

- The platform is a single-purpose event/engagement tool, not a long-lived SaaS product with complex state management needs.
- The summit deadline (30-31 March 2026) demanded rapid development with minimal tooling friction.
- The team at Bukani Tech Solutions has strong TypeScript skills but wanted to minimise dependency churn.
- Bundle size and initial load performance matter for attendees on mobile devices at the venue (potentially congested Wi-Fi).
- The platform needs to work as a PWA with offline capability, where a smaller runtime footprint simplifies service worker caching.

## Decision

Build the frontend as a vanilla TypeScript SPA using Vite as the build tool, with no UI framework (no React, Vue, or Svelte). The application uses:

- A custom hash-based router (`src/router.ts`) with auth guards.
- A lightweight reactive store (`src/store.ts`) using get/set/subscribe pattern.
- Direct DOM manipulation for page rendering via template literals and `innerHTML`.
- CSS custom properties for the design system (tokens, typography, spacing).
- Vite for dev server, HMR, and production bundling with hashed assets.

This approach was chosen because:

1. **Minimal overhead**: No virtual DOM, no framework runtime, no reconciliation. The entire frontend ships under 50 KB gzipped.
2. **Full control**: Direct DOM access simplifies integration with third-party embeds (Mentimeter), SSE streams for live polls, and service worker registration.
3. **No dependency risk**: Zero framework dependencies means no breaking changes from React 19, Vue 4, etc. The only build dependency is Vite + TypeScript.
4. **Fast iteration**: Pages are simple functions that return HTML strings. Adding a new admin page takes minutes, not hours of component wiring.
5. **Team velocity**: For a small team building a purpose-built platform, the cognitive overhead of a framework exceeded the benefit for this scope.

## Consequences

### Positive

- Extremely small bundle size (sub-50 KB) improves load times on mobile and congested venue Wi-Fi.
- No framework version upgrades or breaking changes to manage.
- Full TypeScript type safety without framework-specific type gymnastics (generics for props, context, hooks).
- Simple mental model: each page is a function that renders HTML and attaches event listeners.
- PWA service worker can precache the entire app shell trivially.
- Vite provides excellent DX (HMR, fast builds) without framework plugins.

### Negative

- No component reuse model beyond plain functions. Shared UI patterns (toast, modal, loading button) are implemented as utility functions rather than composable components.
- No declarative data binding. State changes require manual DOM updates, which can lead to subtle bugs if a re-render path is missed.
- Harder to onboard developers who expect React/Vue patterns. The codebase requires understanding of direct DOM APIs.
- No ecosystem of pre-built UI component libraries (Material UI, Vuetify, etc.). All components are hand-built.
- Testing requires `@testing-library/dom` with manual setup rather than framework-specific testing utilities.

### Risks

- If the platform scope grows significantly beyond its current event-engagement purpose (e.g., into a full CRM or multi-tenant SaaS), the lack of a component model will become a productivity bottleneck. At that point, migration to a framework would be warranted and a new ADR should be created.
- Complex interactive features (drag-and-drop, rich text editing, complex forms) would be significantly harder to implement without a framework's state management.
