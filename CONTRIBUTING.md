# Contributing to BeMore

Thank you for your interest in contributing to BeMore, a live engagement and data capture platform for the BeMore SME Access Initiative. This guide will help you get set up and contributing effectively.

## Getting Started

### Prerequisites

- **Node.js 20+** (check with `node -v`)
- **MongoDB** — local instance or [MongoDB Atlas free tier](https://www.mongodb.com/atlas/database)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/BeMore.git
   cd BeMore
   ```

### Backend Setup

```bash
cd backend
cp .env.example .env   # Fill in MONGODB_URI, JWT_SECRET, and RESEND_API_KEY (SMTP removed 2026-05-11)
npm install
npm run dev            # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev            # Starts on http://localhost:3000, proxies /api to localhost:5000
```

The frontend dev server automatically proxies API requests to the backend. If the backend is unreachable, the frontend falls back to a localStorage-based demo mode.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — deployed to Vercel (frontend) and Railway (backend) |
| `staging` | Staging environment — integration testing before production |
| Feature branches | New features and enhancements |
| Fix branches | Bug fixes |

### Branch Naming

```
feature/BTS-{ticket}-{short-description}
fix/BTS-{ticket}-{short-description}
```

Examples:

```
feature/BTS-142-add-poll-analytics
fix/BTS-207-duplicate-email-check
```

### Workflow

1. Branch from `staging`.
2. Open a pull request into `staging`.
3. After review and CI pass, merge into `staging`.
4. Promote `staging` to `main` for production releases.

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add poll results export to CSV
fix: resolve race condition in application status update
refactor: extract email template logic to shared helper
docs: update API endpoint documentation
chore: upgrade mongoose to v8
perf: add index on applications.refNumber
security: add rate limiting to vote endpoint
```

- Keep commits **atomic** — one logical change per commit.
- Write **descriptive** messages that explain the "why", not just the "what".

---

## Code Standards

### Backend (Express + MongoDB)

- **ESM only** — use `import`/`export`, never `require()`.
- **Plain JavaScript** — no TypeScript on the backend.
- **Structured logging** — use Winston (`src/utils/logger.js`). No `console.log` in production code.
- **Environment variables** — all configuration via `src/config/index.js`. Never hardcode secrets, URLs, or credentials.
- **Error handling** — wrap async route handlers, return consistent error envelopes.
- **Input validation** — use `express-validator` for all user input.

### Frontend (Vite + Vanilla TypeScript)

- **TypeScript strict mode** — no `any` types unless absolutely necessary.
- **Vanilla TypeScript** — no frameworks (React, Vue, etc.). DOM manipulation is manual.
- **2 spaces** for indentation.
- **Single quotes** for strings.
- **No `console.log`** — remove before committing.

### General

- All dates stored in UTC, displayed in `Africa/Johannesburg` timezone.
- All monetary values in ZAR.
- Phone numbers stored with `+27` prefix.

---

## Testing

### Backend Tests

```bash
cd backend
npm test                # Runs all 71 Jest tests (sequential, uses mongodb-memory-server)
npm run test:coverage   # With coverage report
npx jest __tests__/auth.test.js          # Single file
npx jest -t "should create application"  # Pattern match
```

### Frontend Tests

```bash
cd frontend
npx vitest run                # Runs all Vitest tests
npm run test:coverage         # With coverage report
npx vitest run src/__tests__/router.test.ts   # Single file
npx vitest run -t "pattern"                   # Pattern match
```

### TypeScript Check

```bash
cd frontend
npx tsc --noEmit
```

### Testing Expectations

- Write tests for all new features.
- Update existing tests when modifying behaviour.
- Ensure all tests pass before opening a PR.
- Backend tests use `mongodb-memory-server` — no external database required.

---

## Pull Request Process

1. **Use the PR template** when opening a pull request.
2. Ensure your branch is up to date with `staging`.
3. All CI checks must pass:
   - Backend tests
   - Frontend tests and TypeScript check
   - Frontend build (`npm run build`)
   - Security scan (`npm audit`)
4. At least **1 approval** is required before merging.
5. Use **squash merge** for feature branches to keep history clean.
6. Delete the branch after merging.

### PR Checklist

- [ ] Tests added or updated
- [ ] No hardcoded secrets or credentials
- [ ] Error handling covers failure cases
- [ ] Logging added at service boundaries
- [ ] PII is not exposed in logs or API responses
- [ ] Tested on mobile viewport (if UI change)
- [ ] TypeScript compiles without errors (if frontend change)

---

## Code Review Guidelines

Reviewers should check for:

### Security

- **OWASP Top 10** — injection, broken auth, sensitive data exposure, etc.
- **PII protection** — personal data must not appear in logs, error messages, or unprotected responses.
- **POPIA compliance** — data collection requires consent; data export and deletion endpoints must work.
- **Rate limiting** — new public endpoints must be rate-limited.
- **Input validation** — all user input validated and sanitised before use.

### Performance

- **N+1 queries** — avoid fetching related documents in loops; use aggregation or `$lookup`.
- **Missing indexes** — queries filtering or sorting on a field need appropriate MongoDB indexes.
- **Unbounded lists** — always paginate list endpoints.

### Correctness

- Does the change match the ticket requirements?
- Are edge cases handled (empty input, duplicate data, network failures)?
- Is error handling present at service boundaries?

### Maintainability

- Clear naming — no abbreviations or magic numbers.
- Single responsibility — functions and modules do one thing.
- Follows existing patterns in the codebase.

---

## South African Context

BeMore operates in the South African market. Keep the following in mind:

| Concern | Standard |
|---------|----------|
| **Currency** | ZAR — display as `R 1,234.56`, store amounts in cents (integer) |
| **Timezone** | `Africa/Johannesburg` (SAST, UTC+2) — store dates in UTC, display in SAST |
| **Phone numbers** | Store with `+27` prefix, validate SA format (10 digits after country code) |
| **ID numbers** | SA ID is 13 digits with Luhn check — never log full ID numbers |
| **Data protection** | POPIA compliance is mandatory — collect only necessary data, honour export/delete requests |
| **Date format** | Display as `DD MMM YYYY` (e.g., 28 Mar 2026) |

---

## Questions?

If you are unsure about anything, open a draft PR or create a discussion. We would rather answer questions early than review code that needs a rewrite.
