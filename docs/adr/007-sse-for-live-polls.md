# ADR-007: Server-Sent Events for Live Poll Results

## Status

Accepted

## Date

2026-03-01

## Context

The BeMore platform includes a live polling feature for use during the summit event. Polls are created by admins, activated for attendees to vote on, and results are displayed in real-time on a projector or shared screen. The results must update live as votes come in, without requiring a page refresh.

Three real-time communication approaches were evaluated:

1. **Polling (HTTP)**: Client sends `GET /api/polls/:id/results` every N seconds. Simple to implement but wastes bandwidth when no new votes have arrived, and introduces latency equal to the polling interval.
2. **WebSockets**: Full-duplex bidirectional communication. Powerful but adds significant complexity: connection management, heartbeats, reconnection logic, and a WebSocket server (e.g., `ws` or `socket.io`) alongside the Express HTTP server.
3. **Server-Sent Events (SSE)**: Server-to-client unidirectional streaming over HTTP. The server pushes updates to the client over a long-lived HTTP connection. Built into browsers via `EventSource` API — no additional client library needed.

Key requirements:

- Updates flow in one direction only: server to client (vote results). The client sends votes via regular `POST` requests.
- The number of concurrent viewers of any single poll is small (tens to low hundreds at a summit session).
- The Express backend runs as a persistent process on Railway (not serverless), so long-lived connections are supported.
- The implementation must work through Vercel's API proxy rewrites.

## Decision

Use Server-Sent Events (SSE) for live poll result streaming, exposed at `GET /api/polls/:id/live`.

Implementation:

- **Server (`pollSSE.js`)**: Maintains a map of active connections per poll ID. When a vote is received (`POST /api/polls/:id/vote`), the poll service computes updated results and broadcasts to all SSE connections for that poll.
- **Client (`poll-sse.ts`)**: Uses the native `EventSource` API to connect to the SSE endpoint. On receiving a `result` event, the poll results chart re-renders with the new data.
- **Connection lifecycle**: The SSE connection sends a `connected` event on establishment, `result` events on vote updates, and a `heartbeat` comment every 30 seconds to keep the connection alive through proxies.
- **Cleanup**: When the `EventSource` is closed (page navigation or browser close), the server removes the connection from its active map via the `close` event on the response object.

The SSE endpoint is public (no JWT required) so that shared display screens at the summit can show live results without admin authentication.

## Consequences

### Positive

- Zero additional dependencies: SSE is built into Express (plain HTTP response with `text/event-stream` content type) and browsers (`EventSource` API). No `socket.io` or `ws` library needed.
- Unidirectional model matches the data flow perfectly — server pushes results, clients display them. No need for bidirectional communication.
- Automatic reconnection: the `EventSource` API automatically reconnects if the connection drops, with configurable retry intervals.
- Works through HTTP proxies and load balancers (including Vercel's rewrite proxy) since it uses standard HTTP.
- Simple server-side implementation: the SSE module is ~60 lines of code, managing a `Map<pollId, Set<Response>>`.
- Rate limiting on the vote endpoint (`60/15min`) prevents abuse without affecting the SSE read stream.

### Negative

- SSE connections are long-lived HTTP connections. Each connected viewer holds an open connection on the Railway backend. For hundreds of concurrent viewers, this consumes server resources (file descriptors, memory).
- SSE is unidirectional (server to client only). If bidirectional communication were needed in the future (e.g., live chat, collaborative editing), SSE would not suffice and WebSockets would be required.
- Internet Explorer does not support `EventSource` natively. This is not a concern for the BeMore audience (modern browsers) but worth noting.
- No built-in message acknowledgment or delivery guarantee. If a client misses a message during a brief disconnect, it will only see the next update, not the missed one. The client reconnects and receives the current state, so this is acceptable for vote tallies (which are cumulative).

### Risks

- If the platform scales to thousands of concurrent poll viewers (e.g., virtual event with remote attendees), the connection count could overwhelm a single Railway dyno. Horizontal scaling with SSE requires a pub/sub layer (Redis) to broadcast across instances. This is not needed at current scale.
- Vercel's proxy has a response timeout. If no data is sent for an extended period, the proxy may close the connection. The 30-second heartbeat comment mitigates this, but the timeout behaviour should be tested under production conditions.
- Long-lived connections may accumulate if clients disconnect uncleanly (e.g., mobile browser backgrounded). The server relies on the TCP stack and Node.js `close` event to detect these, which may have delays.
