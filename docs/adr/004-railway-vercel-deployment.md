# ADR-004: Railway (Backend) + Vercel (Frontend) Deployment

## Status

Accepted

## Date

2025-12-10

## Context

The BeMore platform consists of a static frontend SPA and an Express.js backend API with MongoDB. A deployment strategy was needed that supports:

- Automatic deploys from Git branches (`main` for production, `staging` for pre-production).
- Custom domain support (`bemorecapital.co.za` for staging).
- HTTPS with automatic TLS certificates.
- Environment variable management for secrets (JWT, Resend API key, MongoDB URI; SMTP removed 2026-05-11).
- Cost-effective hosting for a platform with moderate traffic (hundreds of concurrent users during summit events, lower baseline).
- South African audience — latency to Johannesburg matters.

Alternatives considered:

- **Vercel for both**: Vercel Functions (serverless) could host the Express API, but Mongoose connection pooling and long-lived SSE connections for live polls are poorly suited to serverless cold starts and execution time limits.
- **Railway for both**: Railway can serve static files, but lacks Vercel's edge network, automatic image optimisation, and mature CDN for static assets.
- **AWS (ECS/Lambda + CloudFront)**: Full control but significantly more infrastructure to manage for a small team. Overkill for the current scale.
- **DigitalOcean App Platform**: Viable but less integrated Git deploy experience compared to Railway + Vercel.

## Decision

Deploy the frontend to Vercel and the backend to Railway, with Vercel acting as the unified entry point by proxying API requests to Railway.

**Frontend (Vercel)**:
- Auto-deploys from `main` (production) and `staging` branches.
- Serves static assets from the global edge network with immutable cache headers on hashed files.
- `vercel.json` contains rewrite rules that proxy `/api/*` requests to the Railway backend, presenting a single-origin architecture to the browser.
- Custom domain `bemorecapital.co.za` for staging, `bemore-tawny.vercel.app` for production.

**Backend (Railway)**:
- Two Railway services: `bemore-production` and `bemore-staging`.
- Persistent Node.js process (not serverless) — supports Mongoose connection pooling and long-lived SSE connections for live polls.
- Environment variables managed via Railway dashboard.
- Health check endpoint (`GET /api/health`) for Railway's built-in monitoring.
- Trust proxy enabled for accurate IP-based rate limiting behind Vercel's proxy layer.

**API Proxy Architecture**:
```
Browser -> Vercel Edge -> /api/* rewrite -> Railway Backend
Browser -> Vercel Edge -> /* (static) -> Cached SPA assets
```

This eliminates CORS complexity for the browser — all requests go to the same origin.

## Consequences

### Positive

- Single-origin architecture avoids CORS issues. The browser only communicates with Vercel; API calls are proxied transparently.
- Vercel's global CDN provides fast static asset delivery. Hashed assets get 1-year immutable cache headers.
- Railway provides persistent processes suitable for Mongoose connection pools, SSE streams, and Winston logging to stdout.
- Git-based auto-deploy on both platforms. Push to `main` deploys production; push to `staging` deploys staging.
- Cost-effective: Vercel free tier handles the frontend; Railway's usage-based pricing is reasonable for moderate API traffic.
- Independent scaling: frontend and backend can be scaled or redeployed independently.

### Negative

- API requests have additional latency from the Vercel-to-Railway proxy hop. In practice this adds 20-50 ms, acceptable for this use case.
- Two platforms to monitor and manage. Incident response requires checking both Vercel (deploy logs, edge logs) and Railway (application logs, metrics).
- Railway does not have a South Africa region. The backend runs in US or EU, adding latency for SA users. Vercel's edge network partially mitigates this for static assets.
- Vercel's proxy rewrites can mask backend errors — a 502 from Railway may surface as a generic Vercel error page if not handled carefully.

### Risks

- If Railway experiences downtime, the API is unavailable even though the frontend remains accessible (demo mode provides partial mitigation — see ADR-005).
- Vercel's free tier has bandwidth limits. A viral event or unexpected traffic spike could exceed these limits. Upgrading to Vercel Pro would resolve this.
- The proxy rewrite configuration in `vercel.json` is a critical piece of infrastructure. Misconfiguration (e.g., incorrect rewrite ordering) could break API access silently.
