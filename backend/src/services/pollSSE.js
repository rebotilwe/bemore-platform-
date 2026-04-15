/**
 * In-memory SSE (Server-Sent Events) pub/sub for live poll updates.
 * Holds a Map of pollId → Set<ServerResponse>.
 * At 500 concurrent connections this uses negligible memory.
 */

/** @type {Map<string, Set<import('http').ServerResponse>>} */
const clients = new Map();

/** @type {Map<string, NodeJS.Timeout>} */
const keepaliveTimers = new Map();

/**
 * Add an SSE client for a poll.
 * Sets the correct headers and starts keepalive.
 */
export function addClient(pollId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx/proxy buffering
  });

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ pollId, timestamp: new Date().toISOString() })}\n\n`);

  if (!clients.has(pollId)) {
    clients.set(pollId, new Set());
  }
  clients.get(pollId).add(res);

  // Start keepalive for this poll if not already running
  if (!keepaliveTimers.has(pollId)) {
    const timer = setInterval(() => {
      const set = clients.get(pollId);
      if (!set || set.size === 0) {
        clearInterval(timer);
        keepaliveTimers.delete(pollId);
        return;
      }
      for (const client of set) {
        client.write(':keepalive\n\n');
      }
    }, 30000);
    keepaliveTimers.set(pollId, timer);
  }

  // Clean up on disconnect
  res.on('close', () => {
    removeClient(pollId, res);
  });
}

/**
 * Remove an SSE client.
 */
export function removeClient(pollId, res) {
  const set = clients.get(pollId);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      clients.delete(pollId);
      const timer = keepaliveTimers.get(pollId);
      if (timer) {
        clearInterval(timer);
        keepaliveTimers.delete(pollId);
      }
    }
  }
}

/**
 * Broadcast an SSE event to all clients connected to a poll.
 * @param {string} pollId
 * @param {string} eventName - e.g. 'results', 'question-change', 'poll-status'
 * @param {object} data - JSON-serializable data
 */
export function broadcast(pollId, eventName, data) {
  const set = clients.get(pollId);
  if (!set || set.size === 0) return;

  let message;
  try {
    message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  } catch {
    return; // Unserializable data — skip broadcast
  }

  for (const client of set) {
    try {
      client.write(message);
    } catch {
      removeClient(pollId, client);
    }
  }
}

/**
 * Get the number of connected clients for a poll.
 */
export function getClientCount(pollId) {
  return clients.get(pollId)?.size || 0;
}

/**
 * Get total connected clients across all polls.
 */
export function getTotalClientCount() {
  let total = 0;
  for (const set of clients.values()) {
    total += set.size;
  }
  return total;
}
