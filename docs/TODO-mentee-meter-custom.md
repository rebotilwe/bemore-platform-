# TODO: Custom Mentee Meter — Live Polling System

**Priority:** Post-Summit Enhancement
**Status:** COMPLETED
**Created:** 28 March 2026
**Completed:** 29 March 2026
**Actual Effort:** ~8 hours across 4 phases

---

## Why

The Chairman requires all engagement data to feed into our database. The current Mentimeter iframe approach means poll data lives in a third-party system we don't control. Building our own gives us:

- Full data ownership (responses in MongoDB alongside applications)
- BeMore x PBSA branding throughout
- Admin controls from the same dashboard used for lead management
- No external subscription cost
- Analytics integration with existing pipeline

---

## Architecture Decision: SSE (Server-Sent Events)

**Chosen over WebSockets and Short Polling.**

| Criteria | SSE | WebSockets | Short Polling |
|----------|-----|------------|---------------|
| Dependencies needed | None (native) | socket.io (both sides) | None |
| Direction | Server → Client | Bidirectional | Client → Server |
| Auto-reconnect | Built-in | Manual | N/A |
| Proxy-friendly | Yes (standard HTTP) | Can fail behind proxies | Yes |
| 500 users load | Trivial | Trivial | 167 req/s to MongoDB |
| Mobile battery | Efficient | Efficient | Drains battery |

**Pattern:** Voters POST their vote via REST → backend aggregates → broadcasts results to all SSE clients instantly.

---

## Phase 1: Backend Foundation

- [ ] Create `backend/src/models/Poll.js` — Poll schema with embedded questions array
  - Fields: title, description, questions[], activeQuestionIndex, status (draft/active/paused/closed)
  - Question types: multiple-choice, word-cloud, rating, open-text
  - Each question has: text, type, options[], settings (maxSelections, showResults, timer, ratingMax)

- [ ] Create `backend/src/models/PollResponse.js` — Vote storage
  - Fields: pollId, questionId, sessionId, optionId/textResponse/ratingValue
  - Unique compound index on (sessionId + questionId) prevents double-voting

- [ ] Create `backend/src/services/pollSSE.js` — In-memory pub/sub for SSE
  - `Map<pollId, Set<ServerResponse>>` holds connected clients
  - `addClient()`, `removeClient()`, `broadcast()`, `getClientCount()`
  - Keepalive ping every 30 seconds

- [ ] Create `backend/src/services/pollService.js` — Business logic
  - CRUD: createPoll, listPolls, getPollById, updatePoll, deletePoll
  - Live control: setActiveQuestion (broadcasts), setPollStatus (broadcasts)
  - Voting: castVote → aggregate → broadcast results
  - Results: getResults (per question), getDetailedResults (full poll)

- [ ] Create `backend/src/controllers/pollController.js` — Route handlers
- [ ] Create `backend/src/routes/polls.js` — Express router with validation

- [ ] Modify `backend/src/routes/index.js` — mount `/polls`
- [ ] Modify `backend/src/config/rateLimit.js` — add `voteLimiter` (30 votes/15min)
- [ ] Modify `backend/src/models/AnalyticsEvent.js` — add 'poll' to category enum

### API Endpoints

**Admin (JWT required):**
```
POST   /api/polls                  Create poll
GET    /api/polls                  List all polls
GET    /api/polls/:id              Get single poll
PATCH  /api/polls/:id              Update poll (draft only)
PATCH  /api/polls/:id/activate     Set active question → SSE broadcast
PATCH  /api/polls/:id/status       Change status → SSE broadcast
DELETE /api/polls/:id              Delete poll + responses
GET    /api/polls/:id/results      Detailed results breakdown
```

**Public (no auth):**
```
GET    /api/polls/active           Get current active poll + question + results
POST   /api/polls/:id/vote         Submit vote (rate-limited, deduplicated)
GET    /api/polls/:id/live          SSE stream (results, question-change, poll-status)
```

---

## Phase 2: Public Voter Frontend

- [ ] Create `frontend/src/services/poll-sse.ts` — EventSource wrapper
  - connect(pollId, handlers), disconnect(), auto-reconnect handling

- [ ] Create `frontend/src/components/poll-results-chart.ts` — Shared visualisations
  - renderBarChart() — CSS horizontal bars, gold theme, animated
  - renderWordCloud() — flexbox word cloud with font-size scaling
  - renderRatingDisplay() — star/number average display
  - renderOpenTextList() — scrollable response list

- [ ] Rewrite `frontend/src/pages/public/mentee-meter.ts` — Replace iframe with live poll
  - States: loading, no-active-poll, voting, already-voted, results, poll-closed
  - MC: tap option buttons, Word Cloud: text input, Rating: number selector, Open Text: textarea
  - Session ID from sessionStorage (anonymous, per tab)
  - After voting: live-updating results via SSE

- [ ] Rewrite `frontend/src/styles/pages/mentee-meter.css` — Poll voting + results styles

- [ ] Modify `frontend/src/api.ts` — add getActivePoll, vote, getResults methods
- [ ] Modify `frontend/src/constants/summit-config.ts` — remove MENTIMETER_URL

---

## Phase 3: Admin Poll Manager

- [ ] Create `frontend/src/pages/admin/polls.ts` — 3 views:
  1. **Poll List** — table with status badges, create/edit/delete actions
  2. **Poll Builder** — title, questions, type selector, options editor, save as draft/activate
  3. **Live Control Panel** — current question, vote counter, results chart, Next/Prev/Close buttons, viewer count

- [ ] Create `frontend/src/styles/pages/poll-admin.css` — Admin styles

- [ ] Modify `frontend/src/router.ts` — add `/admin/polls` route
- [ ] Modify `frontend/src/pages/admin/layout.ts` — add "Mentee Meter" sidebar item
- [ ] Modify `frontend/src/styles/main.css` — import poll-admin.css

---

## Phase 4: Testing & Polish

- [ ] Mobile testing on actual phones (summit attendees scan QR)
- [ ] SSE reconnection testing (drop WiFi, reconnect)
- [ ] Double-vote prevention at database level
- [ ] Admin advancing question while 500 users connected
- [ ] No-active-poll graceful fallback state
- [ ] Existing 97 backend tests still pass
- [ ] New poll endpoint tests (create, vote, deduplicate, SSE)
- [ ] Frontend build still clean

---

## Question Types

| Type | Voter UI | Results |
|------|----------|---------|
| Multiple Choice | Tap option buttons (gold/outlined) | Horizontal bar chart with %, live-updating |
| Word Cloud | Text input + submit | CSS word cloud, larger text = more votes |
| Rating (1-5 or 1-10) | Number/star selector | Average display + distribution bars |
| Open Text | Textarea + submit | Scrollable response list |

---

## Scope Summary

| Metric | Count |
|--------|-------|
| New files | 13 |
| Modified files | 8 |
| New npm dependencies | 0 |
| Backend tests to add | ~20 |
| Estimated hours | 14-21 |

---

## Files Quick Reference

**New backend:**
- `backend/src/models/Poll.js`
- `backend/src/models/PollResponse.js`
- `backend/src/services/pollSSE.js`
- `backend/src/services/pollService.js`
- `backend/src/controllers/pollController.js`
- `backend/src/routes/polls.js`

**New frontend:**
- `frontend/src/services/poll-sse.ts`
- `frontend/src/components/poll-results-chart.ts`
- `frontend/src/pages/admin/polls.ts`
- `frontend/src/styles/pages/poll-admin.css`

**Rewrite:**
- `frontend/src/pages/public/mentee-meter.ts`
- `frontend/src/styles/pages/mentee-meter.css`

**Modify:**
- `backend/src/routes/index.js`
- `backend/src/config/rateLimit.js`
- `backend/src/models/AnalyticsEvent.js`
- `frontend/src/api.ts`
- `frontend/src/router.ts`
- `frontend/src/pages/admin/layout.ts`
- `frontend/src/styles/main.css`
- `frontend/src/constants/summit-config.ts`
