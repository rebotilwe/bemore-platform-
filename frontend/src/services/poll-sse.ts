/**
 * SSE (Server-Sent Events) client for live poll updates.
 * Uses the native EventSource API — zero dependencies.
 */

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface PollSSEHandlers {
  onResults?: (data: unknown) => void;
  onQuestionChange?: (data: unknown) => void;
  onPollStatus?: (data: unknown) => void;
  onConnected?: (data: unknown) => void;
}

let source: EventSource | null = null;

function safeParse(raw: string): unknown | null {
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function connect(pollId: string, handlers: PollSSEHandlers): void {
  disconnect();

  source = new EventSource(`${API_URL}/polls/${pollId}/live`);

  source.addEventListener('results', (e) => {
    const data = safeParse(e.data);
    if (data) handlers.onResults?.(data);
  });

  source.addEventListener('question-change', (e) => {
    const data = safeParse(e.data);
    if (data) handlers.onQuestionChange?.(data);
  });

  source.addEventListener('poll-status', (e) => {
    const data = safeParse(e.data);
    if (data) handlers.onPollStatus?.(data);
  });

  source.addEventListener('connected', (e) => {
    const data = safeParse(e.data);
    if (data) handlers.onConnected?.(data);
  });

  source.onerror = () => {
    // EventSource auto-reconnects — no action needed
  };
}

export function disconnect(): void {
  if (source) {
    source.close();
    source = null;
  }
}

export function isConnected(): boolean {
  return source?.readyState === EventSource.OPEN;
}
