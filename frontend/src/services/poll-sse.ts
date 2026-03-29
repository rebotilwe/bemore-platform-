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

export function connect(pollId: string, handlers: PollSSEHandlers): void {
  disconnect();

  source = new EventSource(`${API_URL}/polls/${pollId}/live`);

  source.addEventListener('results', (e) => {
    handlers.onResults?.(JSON.parse(e.data));
  });

  source.addEventListener('question-change', (e) => {
    handlers.onQuestionChange?.(JSON.parse(e.data));
  });

  source.addEventListener('poll-status', (e) => {
    handlers.onPollStatus?.(JSON.parse(e.data));
  });

  source.addEventListener('connected', (e) => {
    handlers.onConnected?.(JSON.parse(e.data));
  });

  source.onerror = () => {
    // EventSource auto-reconnects — no action needed
    // But we could show a "reconnecting..." indicator
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
