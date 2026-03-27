# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BeMore is a lead-generation portal for the BeMore SME Access Initiative, targeting South African property developers, landowners, student accommodation operators, and built environment professionals seeking institutional funding partnerships (DBSA, NHFC, NEF, SAIF). Summit event: 30-31 March 2026, Sandton.

## Architecture

The project has two versions: an original static prototype and a full-stack MVP.

### Static Prototype (`bemore-portal.html`)
Single-file app (~1800 lines) with all HTML/CSS/JS inline. Client-side only with hardcoded `LEADS` array. Admin login: `admin` / `bemore2026`. No backend.

### Full-Stack MVP
- **Frontend**: `bemore-mvp.html` — Single-page app that auto-detects the backend. Tries `GET /api/health` on load; if backend is running, uses MongoDB; otherwise falls back to localStorage (demo mode). Admin login: `admin@bemore.co.za` / `BeMore@2026!`
- **Backend**: `bemore-server.js` — Node.js + Express + MongoDB (Mongoose). Single-file server (~600 lines).
- **Config**: `bemore-package.json` (rename to `package.json` in `backend/`), `bemore-env.example` (rename to `.env`)

### Intended Directory Structure (per README)
```
frontend/index.html     ← bemore-mvp.html
backend/server.js       ← bemore-server.js
backend/.env.example    ← bemore-env.example
backend/package.json    ← bemore-package.json
```
Files are currently flat in the root — not yet organized into this structure.

## Development Commands

```bash
# Frontend only (no backend needed)
# Open bemore-mvp.html in a browser — works with localStorage

# Backend setup
cp bemore-env.example .env          # then fill in MongoDB URI + credentials
npm install                          # using bemore-package.json
npm run dev                          # nodemon auto-restart (dev)
npm start                            # production
```

Backend runs at `http://localhost:5000`. Frontend `API_URL` is hardcoded to `http://localhost:5000/api` in bemore-mvp.html (line ~1011).

## Key Architecture Patterns

### View System (Frontend)
SPA with CSS class toggling (`.view.active`). Views switched via `go(viewId)` (MVP) or `showView(id)` (prototype):
- `v-hero` → `v-gate` → `v-form` → `v-done` (public flow)
- `v-login` → `v-admin` (admin flow with sidebar sub-pages)

### Auto-Tagging Engine (Backend)
Mongoose `pre('save')` hook on the Application schema automatically applies intelligence tags based on form data (e.g., `HIGH_VALUE`, `SHOVEL_READY`, `PIPELINE_READY`, `INSTITUTIONAL_GRADE`). Tags drive the pre-built reports.

### API Authentication
JWT-based. Admin endpoints require `Authorization: Bearer <token>`. Token stored in `localStorage` as `bm_token`.

### API Endpoints
- **Public**: `POST /api/applications` (submit form), `GET /api/health`
- **Admin** (JWT required): `GET/PATCH /api/applications`, `GET /api/applications/stats`, `GET /api/applications/export/csv`, `GET /api/reports/:name`, `POST /api/auth/login`
- **Report names**: `high-value-developers`, `pipeline-ready-land`, `institutional-grade-housing`, `deal-room-shortlist`

### Application Status Flow
`new` → `reviewing` → `shortlisted` → `invited` → `funded`

## Design System

- **Dark luxury editorial**: gold (`--gold: #c9a84c`) on near-black (`--ink`) palette
- Fonts: Cormorant Garamond (serif headings, `.serif`/`.display`), DM Sans (body), DM Mono (monospace)
- Category tags: `developer`, `landowner`, `student` (operators), `professional`
- Funders: DBSA, NHFC, NEF, SAIF

## Key Dependencies (Backend)
express, mongoose, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, express-validator, nodemailer, uuid
